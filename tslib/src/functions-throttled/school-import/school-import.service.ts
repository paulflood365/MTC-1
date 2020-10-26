import { ConnectionPool } from 'mssql'
import * as csv from 'csv-string'
import { ISchoolDataService, SchoolDataService } from './data-access/school.data.service'
import { ConsoleLogger, ILogger } from '../../common/logger'
import { SchoolImportJobResult } from './SchoolImportJobResult'
import { ISchoolImportPredicates, Predicates } from './predicates'
import { SchoolRecordMapper } from './school-mapper'
import { SchoolImportError } from './SchoolImportError'

const name = 'school-import'
const targetAge = 9

export class SchoolImportService {
  private readonly schoolDataService: ISchoolDataService
  private readonly logger: ILogger
  private jobResult: SchoolImportJobResult
  private readonly predicates: ISchoolImportPredicates
  private readonly schoolRecordMapper: SchoolRecordMapper

  constructor (pool: ConnectionPool,
    jobResult: SchoolImportJobResult,
    logger?: ILogger,
    schoolDataService?: ISchoolDataService,
    predicates?: ISchoolImportPredicates) {
    if (schoolDataService === undefined) {
      schoolDataService = new SchoolDataService(pool, jobResult)
    }
    this.schoolDataService = schoolDataService
    if (predicates === undefined) {
      predicates = new Predicates()
    }
    this.predicates = predicates
    if (logger === undefined) {
      logger = new ConsoleLogger()
    }
    this.logger = logger
    this.jobResult = jobResult
    this.schoolRecordMapper = new SchoolRecordMapper()
  }

  async process (blob: any): Promise<SchoolImportJobResult> {
    const csvParsed = csv.parse(blob.toString())
    const mapper = [
      ['URN', 'urn'],
      ['LA (code)', 'leaCode'],
      ['EstablishmentNumber', 'estabCode'],
      ['EstablishmentName', 'name'],
      ['StatutoryLowAge', 'statLowAge'],
      ['StatutoryHighAge', 'statHighAge'],
      ['EstablishmentStatus (code)', 'estabStatusCode'],
      ['TypeOfEstablishment (code)', 'estabTypeCode'],
      ['EstablishmentTypeGroup (code)', 'estabTypeGroupCode']
    ]

    let mapping
    try {
      const columnHeaders = csvParsed.shift()
      if (columnHeaders === undefined || columnHeaders.length === 0) {
        throw new Error('no header row found')
      }
      mapping = this.schoolRecordMapper.mapColumns(columnHeaders, mapper)
    } catch (error) {
      this.jobResult.stderr = [`Failed to map columns, error raised was ${error.message}`]
      throw new SchoolImportError(this.jobResult, error)
    }

    try {
      const filteredSchools = new Array<any>()
      for (let index = 0; index < csvParsed.length; index++) {
        const row = csvParsed[index]
        const schoolRecord = this.schoolRecordMapper.mapRow(row, mapping)
        const isOpen = this.predicates.isSchoolOpen(schoolRecord)
        const isCorrectTypeGroup = this.predicates.isRequiredEstablishmentTypeGroup(schoolRecord)
        const isCorrectAgeRange = this.predicates.isAgeInRange(targetAge, schoolRecord)
        const matchesAll = isOpen.isMatch && isCorrectTypeGroup.isMatch && isCorrectAgeRange.isMatch
        if (matchesAll) {
          filteredSchools.push(schoolRecord)
        } else {
          this.jobResult.stdout.push(this.createLogEntry(isOpen.message))
          this.jobResult.stdout.push(this.createLogEntry(isCorrectTypeGroup.message))
          this.jobResult.stdout.push(this.createLogEntry(isCorrectAgeRange.message))
        }
      }
      await this.schoolDataService.bulkUpload(this.logger, filteredSchools)
      this.logger.verbose(`${name}  bulkUpload complete`)
      return this.jobResult
    } catch (error) {
      throw new SchoolImportError(this.jobResult, error)
    }
  }

  private createLogEntry (msg: string): string {
    if (msg.length > 0) {
      return `${(new Date()).toISOString()} school-import: ${msg}`
    }
    return ''
  }
}
