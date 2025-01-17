import { ValidateCheckMessageV1, MarkCheckMessageV1, ReceivedCheckFunctionBindingEntity } from '../../schemas/models'
import { ILogger } from '../../common/logger'
import * as RA from 'ramda-adjunct'
import Moment from 'moment'
import { ICompressionService, CompressionService } from '../../common/compression-service'
import { ICheckNotificationMessage, CheckNotificationType } from '../../schemas/check-notification-message'
import { ICheckValidationError } from './validators/validator-types'
import { ValidatorProvider } from './validators/validator.provider'
import { ITableService, TableService } from '../../azure/table-service'
import { ReceivedCheckBindingEntityTransformer } from '../../services/receivedCheckBindingEntityTransformer'

const functionName = 'check-validator'
const tableStorageTableName = 'receivedCheck'

export interface ICheckValidatorFunctionBindings {
  receivedCheckTable: any[]
  checkMarkingQueue: any[]
  checkNotificationQueue: ICheckNotificationMessage[]
}

export class CheckValidator {
  private readonly tableService: ITableService
  private readonly compressionService: ICompressionService
  private readonly validatorProvider: ValidatorProvider
  private readonly receivedCheckTransformer: ReceivedCheckBindingEntityTransformer

  constructor (tableService?: ITableService, compressionService?: ICompressionService) {
    if (tableService !== undefined) {
      this.tableService = tableService
    } else {
      this.tableService = new TableService()
    }

    if (compressionService !== undefined) {
      this.compressionService = compressionService
    } else {
      this.compressionService = new CompressionService()
    }
    this.validatorProvider = new ValidatorProvider()
    this.receivedCheckTransformer = new ReceivedCheckBindingEntityTransformer()
  }

  async validate (functionBindings: ICheckValidatorFunctionBindings, validateCheckMessage: ValidateCheckMessageV1, logger: ILogger): Promise<void> {
    // this should fail outside of the catch as we wont be able to update the entity
    // without a reference to it and should rightly go on the dead letter queue
    const receivedCheck = this.findReceivedCheck(functionBindings.receivedCheckTable)
    let checkData
    try {
      if (receivedCheck.archive === undefined) {
        throw new Error(`${functionName}: message is missing [archive] property`)
      }
      const decompressedString = this.compressionService.decompress(receivedCheck.archive)
      checkData = JSON.parse(decompressedString)
      this.validateCheckStructure(checkData)
    } catch (error: any) {
      await this.setReceivedCheckAsInvalid(error.message, receivedCheck)
      // dispatch message to indicate validation failure
      const validationFailure: ICheckNotificationMessage = {
        checkCode: validateCheckMessage.checkCode,
        notificationType: CheckNotificationType.checkInvalid,
        version: 1
      }
      functionBindings.checkNotificationQueue = [validationFailure]
      logger.error(error.message)
      return
    }

    await this.setReceivedCheckAsValid(receivedCheck, checkData)
    // dispatch message to indicate ready for marking
    const markingMessage: MarkCheckMessageV1 = {
      schoolUUID: validateCheckMessage.schoolUUID,
      checkCode: validateCheckMessage.checkCode,
      version: 1
    }

    functionBindings.checkMarkingQueue = [markingMessage]
  }

  private async setReceivedCheckAsValid (receivedCheckEntity: ReceivedCheckFunctionBindingEntity, checkData: any): Promise<void> {
    const transformedEntity = this.receivedCheckTransformer.transform(receivedCheckEntity)
    transformedEntity.validatedAt = Moment().toDate()
    transformedEntity.isValid = true
    transformedEntity.answers = JSON.stringify(checkData.answers)
    await this.tableService.mergeUpdateEntity(tableStorageTableName, transformedEntity)
  }

  private async setReceivedCheckAsInvalid (errorMessage: string, receivedCheckEntity: ReceivedCheckFunctionBindingEntity): Promise<void> {
    const transformedEntity = this.receivedCheckTransformer.transform(receivedCheckEntity)
    transformedEntity.processingError = errorMessage
    transformedEntity.validatedAt = Moment().toDate()
    transformedEntity.isValid = false
    await this.tableService.mergeUpdateEntity(tableStorageTableName, transformedEntity)
  }

  private findReceivedCheck (receivedCheckRef: any[]): ReceivedCheckFunctionBindingEntity {
    if (RA.isEmptyArray(receivedCheckRef)) {
      throw new Error(`${functionName}: received check reference is empty`)
    }
    return receivedCheckRef[0]
  }

  private validateCheckStructure (submittedCheck: any): void {
    const validators = this.validatorProvider.getValidators()
    const validationErrors: ICheckValidationError[] = []
    for (let index = 0; index < validators.length; index++) {
      const validator = validators[index]
      const validationResult = validator.validate(submittedCheck)
      if (validationResult !== undefined) {
        validationErrors.push(validationResult)
      }
    }
    if (validationErrors.length > 0) {
      let validationErrorsMessage = `${functionName}: check validation failed. checkCode: ${submittedCheck.checkCode}`
      for (let index = 0; index < validationErrors.length; index++) {
        const error = validationErrors[index]
        validationErrorsMessage += `\n\t-\t${error.message}`
      }
      throw new Error(validationErrorsMessage)
    }
  }
}
