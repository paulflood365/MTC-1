'use strict'

/* global beforeEach, spyOn, describe, it, expect */

const fs = require('fs-extra')
const fileValidator = require('../../../../lib/validator/file-validator')
const fileCsvErrors = require('../../../../lib/errors/file-csv')

describe('File validator', function () {
  let uploadedFile

  describe('received valid data and', function () {
    beforeEach(function () {
      spyOn(fs, 'readFileSync').and.returnValue('text')
      uploadedFile = {
        file: 'test.csv'
      }
    })

    it('allows a valid request', async () => {
      const validationError = await fileValidator.validate(uploadedFile, 'template-upload')
      expect(validationError.hasError()).toBe(false)
    })
  })
  describe('received empty data and', function () {
    beforeEach(function () {
      spyOn(fs, 'readFileSync').and.returnValue('')
      uploadedFile = null
    })
    it('detects no file', async () => {
      const validationError = await fileValidator.validate(uploadedFile, 'template-upload')
      expect(validationError.hasError()).toBe(true)
      expect(validationError.isError('template-upload')).toBe(true)
      expect(validationError.get('template-upload')).toBe(fileCsvErrors.noFile)
    })
    it('detects empty file on unreadable file', async () => {
      uploadedFile = { file: 'test.csv' }
      const validationError = await fileValidator.validate(uploadedFile, 'template-upload')
      expect(validationError.hasError()).toBe(true)
      expect(validationError.isError('template-upload')).toBe(true)
      expect(validationError.get('template-upload')).toBe(fileCsvErrors.isNotReadable)
    })
    it('detects not acceptable file', async () => {
      uploadedFile = { file: 'file.txt' }
      const validationError = await fileValidator.validate(uploadedFile, 'template-upload')
      expect(validationError.hasError()).toBe(true)
      expect(validationError.isError('template-upload')).toBe(true)
      expect(validationError.get('template-upload')).toBe(fileCsvErrors.noCSVFile)
    })
  })
})
