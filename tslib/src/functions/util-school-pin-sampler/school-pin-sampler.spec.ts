import { SchoolPinSampler } from './school-pin-sampler'
import { TimezoneUtil } from '../school-pin-generator/timezone-util'
import moment = require('moment')

let sut: SchoolPinSampler

describe('school-pin-sampler', () => {
  beforeAll(() => {
    // Attempt to fix a flaky test
    // Very, very occasionally 'does randomise if specified' fails because undefined is added to the reducedZoneSet
    // but this test appears to run well when run on it's own, so the hypothesis here is that the order of tests is important
    // and some _other_ test in the suite is failing to unmock.  If this test keeps failing, even with this unmock code in, then please
    // delete this block.
    jest.restoreAllMocks() // this doesn't work.
  })

  beforeEach(() => {
    sut = new SchoolPinSampler()
  })

  test('subject should be defined', () => {
    expect(sut).toBeInstanceOf(SchoolPinSampler)
  })

  test('returns a set of generated pins equal to the size requested', () => {
    const sampleSizeRequested = 5
    const samples = sut.generateSample(sampleSizeRequested, moment.utc())
    expect(samples).toHaveLength(sampleSizeRequested)
  })

  test('throws error if sample size is larger than all available timezones', async () => {
    const tzUtil = new TimezoneUtil()
    const maximumSampleSize = tzUtil.getTimezoneList().length
    try {
      sut.generateSample(maximumSampleSize + 1, moment.utc())
      fail('should have thrown an error')
    } catch (error) {
      expect(error.message).toBe(`maximum sample size is ${maximumSampleSize}`)
    }
  })

  test('each sample has a pin and expiry time', () => {
    const sampleSizeRequested = 5
    const samples = sut.generateSample(sampleSizeRequested, moment.utc())
    for (let index = 0; index < sampleSizeRequested; index++) {
      const sample = samples[index]
      expect(sample.pin).toBeDefined()
      expect(sample.pin).toHaveLength(8)
      expect(sample.pinExpiresAt).toBeDefined()
      expect(sample.timezone).toBeDefined()
    }
  })

  test('does not randomise if not specified', () => {
    const sampleSizeRequested = 5
    const samples = sut.generateSample(sampleSizeRequested, moment.utc())
    expect(samples).toHaveLength(sampleSizeRequested)
    const tzUtil = new TimezoneUtil()
    const zones = tzUtil.getTimezoneList()
    expect(samples[0].timezone).toStrictEqual(zones[0].name)
    expect(samples[1].timezone).toStrictEqual(zones[1].name)
    expect(samples[2].timezone).toStrictEqual(zones[2].name)
    expect(samples[3].timezone).toStrictEqual(zones[3].name)
    expect(samples[4].timezone).toStrictEqual(zones[4].name)
  })

  test('does randomise if specified', () => {
    const sampleSizeRequested = 10
    const nonRandomSamples = sut.generateSample(sampleSizeRequested, moment.utc(), false)
    const randomSamples = sut.generateSample(sampleSizeRequested, moment.utc(), true)
    expect(nonRandomSamples).toHaveLength(sampleSizeRequested)
    expect(randomSamples).toHaveLength(sampleSizeRequested)
    const nonRandomZones = nonRandomSamples.map(s => s.timezone).join('-')
    const randomZones = randomSamples.map(s => s.timezone).join('-')
    expect(nonRandomZones).not.toStrictEqual(randomZones)
  })
})
