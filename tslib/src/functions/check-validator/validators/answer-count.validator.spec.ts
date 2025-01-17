import { AnswerCountValidator } from './answer-count.validator'
import { ICheckValidationError } from './validator-types'
import config from '../../../config'

let sut: AnswerCountValidator

describe('answer-count.validator', () => {
  beforeEach(() => {
    sut = new AnswerCountValidator()
  })

  test('less answers fails validation', () => {
    const expectedQuestionCount = config.LiveFormQuestionCount
    const check = {
      answers: [] as any
    }
    for (let index = 1; index < expectedQuestionCount; index++) {
      check.answers.push({
        answer: index,
        clientTimestamp: '',
        factor1: 1,
        factor2: 1,
        question: '1x1',
        sequenceNumber: 1
      })
    }
    const error = sut.validate(check)
    expect(error).toBeDefined()
    expect((error as ICheckValidationError).message).toBe(`submitted check has ${expectedQuestionCount - 1} answers`)
  })

  test('no answers property found fails validation', () => {
    const check = {}
    const error = sut.validate(check)
    expect(error).toBeDefined()
    expect((error as ICheckValidationError).message).toBe('no answers property found')
  })

  test('zero answer count fails validation', () => {
    const check = {
      answers: [] as any
    }
    const error = sut.validate(check)
    expect(error).toBeDefined()
    expect((error as ICheckValidationError).message).toBe('submitted check has 0 answers')
  })

  test('correct answer count passes validation', () => {
    const check = {
      answers: [] as any
    }
    for (let index = 0; index < 25; index++) {
      check.answers.push({
        answer: index,
        clientTimestamp: '',
        factor1: 1,
        factor2: 1,
        question: '1x1',
        sequenceNumber: 1
      })
    }
    const error = sut.validate(check)
    expect(error).not.toBeDefined()
  })

  test('more answers passes validation', () => {
    const check = {
      answers: [] as any
    }
    for (let index = 0; index < 35; index++) {
      check.answers.push({
        answer: index,
        clientTimestamp: '',
        factor1: 1,
        factor2: 1,
        question: '1x1',
        sequenceNumber: 1
      })
    }
    const error = sut.validate(check)
    expect(error).not.toBeDefined()
  })
})
