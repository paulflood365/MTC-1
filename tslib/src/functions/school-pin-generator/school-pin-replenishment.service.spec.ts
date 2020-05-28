import { SchoolPinReplenishmnentService, School, SchoolPinUpdate } from './school-pin-replenishment.service'
import moment from 'moment'
import { ISchoolPinReplenishmentDataService } from './school-pin-replenishment.data.service'
import { ILogger, ConsoleLogger } from '../../common/logger'
import { IConfigProvider } from './config-file-provider'

const SchoolPinGeneratorDataServiceMock = jest.fn<ISchoolPinReplenishmentDataService, any>(() => ({
  getAllSchools: jest.fn(),
  updatePin: jest.fn(),
  getSchoolById: jest.fn()
}))

const configProviderMock: IConfigProvider = {
  AllowedWords: 'aaa,bbb,ccc,ddd,eee',
  BannedWords: 'dim',
  OverridePinExpiry: false,
  PinUpdateMaxAttempts: 5,
  DigitChars: '234'
}

let sut: SchoolPinReplenishmnentService
let dataService: ISchoolPinReplenishmentDataService
let logger: ILogger = new ConsoleLogger()

describe('school-pin-replenishment.service', () => {

  beforeEach(() => {
    dataService = new SchoolPinGeneratorDataServiceMock()
    sut = new SchoolPinReplenishmnentService(dataService, undefined, configProviderMock)
  })

  it('should be defined', () => {
    expect(sut).toBeInstanceOf(SchoolPinReplenishmnentService)
  })

  it('should create a new pin for each school that requires one when no school uuid provided', async () => {
    const oneHourAgo = moment().add(-1, 'hours')
    const oneHourFromNow = moment().add(1, 'hours')

    const schools: School[] = [
      {
        id: 1,
        name: 'school 1',
        pinExpiresAt: oneHourFromNow,
        pin: 'abc12def'
      },
      {
        id: 2,
        name: 'school 2',
        pinExpiresAt: oneHourAgo,
        pin: 'foo23bar'
      },
      {
        id: 3,
        name: 'school 3',
        pinExpiresAt: oneHourFromNow,
        pin: 'baz44bug'
      }
    ]
    dataService.getAllSchools = jest.fn(async () => {
      return schools
    })
    let update: SchoolPinUpdate | undefined
    dataService.updatePin = jest.fn(async (schoolUpdate) => {
      update = schoolUpdate
    })
    await sut.process(logger)
    expect(dataService.updatePin).toHaveBeenCalledTimes(1)
    expect(update).toBeDefined()
    // optional chaining not currently supported in our ts-jest setup
    expect(update ? update.id : undefined).toEqual(2)
  })

  test('it should fail after making configured number of attempts', async () => {
    const oneHourAgo = moment().add(-1, 'hours')

    const schools: School[] = [
      {
        id: 1,
        name: 'school 1',
        pinExpiresAt: oneHourAgo,
        pin: 'foo23bar'
      }
    ]
    dataService.getAllSchools = jest.fn(async () => {
      return schools
    })
    dataService.updatePin = jest.fn(async (schoolUpdate) => {
      throw new Error('mock error')
    })
    await sut.process(logger)
    expect(dataService.updatePin).toHaveBeenCalledTimes(configProviderMock.PinUpdateMaxAttempts)
  })

  test('if no schools to process, service returns early', async () => {
    dataService.getAllSchools = jest.fn(async () => {
      return []
    })
    await sut.process(logger)
    expect(dataService.updatePin).not.toHaveBeenCalled()
  })

  test('only updates single school specified when schoolUUID passed as param', async () => {
    dataService.getSchoolById = jest.fn(async (id: number) => {
      const school: School = {
        id: 1,
        name: 'x'
      }
      return school
    })
    const schoolId = 42
    await sut.process(logger, schoolId)
    expect(dataService.getSchoolById).toHaveBeenCalledTimes(1)
    expect(dataService.updatePin).toHaveBeenCalledTimes(1)
  })

  test('returns generated pin when single schoolUUID passed as param', async () => {
    dataService.getSchoolById = jest.fn(async (id: number) => {
      const school: School = {
        id: 1,
        name: 'x'
      }
      return school
    })
    const schoolId = 42
    const generatedPin = await sut.process(logger, schoolId)
    expect(generatedPin).toBeDefined()
    expect(dataService.getSchoolById).toHaveBeenCalledTimes(1)
    expect(dataService.updatePin).toHaveBeenCalledTimes(1)
  })
})