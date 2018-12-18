const featureToggles = require('feature-toggles')

const checkWindowV2Service = require('../services/check-window-v2.service')
const groupService = require('../services/group.service')

const pupilIdentificationFlag = require('../services/pupil-identification-flag.service')
const pupilStatusService = require('../services/pupil.status.service')
const restartService = require('../services/restart.service')
const restartV2Service = require('../services/restart-v2.service')
const restartValidator = require('../lib/validator/restart-validator')
const schoolHomePinGenerationEligibilityPresenter = require('../helpers/school-home-pin-generation-eligibility-presenter')
const ValidationError = require('../lib/validation-error')
const Logger = require('../models/logger')
const logger = new Logger()

const controller = {}

controller.getRestartOverview = async (req, res, next) => {
  res.locals.pageTitle = 'Restarts'
  req.breadcrumbs(res.locals.pageTitle)

  let checkWindowData
  let restarts
  let pinGenerationEligibilityData
  try {
    if (featureToggles.isFeatureEnabled('prepareCheckMessaging')) {
      restarts = await restartV2Service.getRestartsForSchool(req.user.schoolId)
    } else {
      restarts = await restartService.getSubmittedRestarts(req.user.School)
    }
    checkWindowData = await checkWindowV2Service.getActiveCheckWindow()
    pinGenerationEligibilityData = await schoolHomePinGenerationEligibilityPresenter.getPresentationData(checkWindowData)
  } catch (error) {
    return next(error)
  }
  let { hl } = req.query
  if (hl) {
    hl = hl.split(',').map(h => decodeURIComponent(h))
  }
  return res.render('restart/restart-overview', {
    breadcrumbs: req.breadcrumbs(),
    highlight: hl && new Set(hl),
    messages: res.locals.messages,
    pinGenerationEligibilityData,
    restarts
  })
}

controller.getSelectRestartList = async (req, res, next) => {
  res.locals.pageTitle = 'Select pupils for restart'
  req.breadcrumbs('Restarts', '/restart/overview')
  req.breadcrumbs(res.locals.pageTitle)
  let pupils
  let reasons
  let groups = []
  let groupIds = req.params.groupIds || ''

  try {
    if (featureToggles.isFeatureEnabled('prepareCheckMessaging')) {
      pupils = await restartV2Service.getPupilsEligibleForRestart(req.user.schoolId)
    } else {
      pupils = await restartService.getPupils(req.user.School)
    }

    reasons = await restartService.getReasons()

    if (pupils.length > 0) {
      groups = await groupService.findGroupsByPupil(req.user.schoolId, pupils)
    }
  } catch (error) {
    return next(error)
  }
  return res.render('restart/select-restart-list', {
    breadcrumbs: req.breadcrumbs(),
    pupils,
    reasons,
    groups,
    groupIds,
    error: new ValidationError()
  })
}

controller.postSubmitRestartList = async (req, res, next) => {
  const { pupil: pupilsList, restartReason, classDisruptionInfo, didNotCompleteInfo, restartFurtherInfo } = req.body
  if (!pupilsList || pupilsList.length === 0) {
    return res.redirect('/restart/select-restart-list')
  }
  const info = classDisruptionInfo || didNotCompleteInfo
  const validationError = restartValidator.validateReason(restartReason, info)
  if (validationError.hasError()) {
    const pageTitle = 'Select pupils for restart'
    res.locals.pageTitle = `Error: ${pageTitle}`
    req.breadcrumbs('Restarts', '/restart/overview')
    req.breadcrumbs(pageTitle)
    let pupils
    let reasons
    let groups = []
    let groupIds = req.params.groupIds || ''

    try {
      if (featureToggles.isFeatureEnabled('prepareCheckMessaging')) {
        pupils = await restartV2Service.getPupilsEligibleForRestart(req.user.schoolId)
      } else {
        pupils = await restartService.getPupils(req.user.School)
        pupils = pupilIdentificationFlag.addIdentificationFlags(pupils)
      }
      reasons = await restartService.getReasons()
      if (pupils.length > 0) {
        groups = await groupService.findGroupsByPupil(req.user.schoolId, pupils)
      }
    } catch (error) {
      return next(error)
    }
    return res.render('restart/select-restart-list', {
      breadcrumbs: req.breadcrumbs(),
      pupils,
      reasons,
      groups,
      groupIds,
      error: validationError
    })
  }
  let submittedRestarts
  try {
    submittedRestarts = await restartService.restart(pupilsList, restartReason, classDisruptionInfo, didNotCompleteInfo, restartFurtherInfo, req.user.id, req.user.schoolId)
  } catch (error) {
    return next(error)
  }
  const restartInfo = submittedRestarts.length < 2 ? 'Restart made for 1 pupil' : `Restarts made for ${submittedRestarts.length} pupils`
  const restartIds = submittedRestarts && submittedRestarts.map(r => encodeURIComponent(r.insertId))
  const ids = restartIds.join()
  req.flash('info', restartInfo)

  // Ask for these pupils to have their status updated
  try {
    if (featureToggles.isFeatureEnabled('prepareCheckMessaging')) {
      await pupilStatusService.recalculateStatusByPupilIds(pupilsList, req.user.schoolId)
    }
  } catch (error) {
    logger.error('Failed to recalculate pupil status', error)
    throw error
  }

  return res.redirect(`/restart/overview?hl=${ids}`)
}

controller.postDeleteRestart = async (req, res, next) => {
  let pupil
  const pupilSlug = req.body && req.body.pupil
  try {
    pupil = await restartService.markDeleted(pupilSlug, req.user.id, req.user.schoolId)
  } catch (error) {
    logger.error('Failed to mark restart as deleted', error)
    return next(error)
  }

  // Ask for these pupils to have their status updated
  try {
    if (featureToggles.isFeatureEnabled('prepareCheckMessaging')) {
      await pupilStatusService.recalculateStatusByPupilIds([pupil.id], req.user.schoolId)
    }
  } catch (error) {
    logger.error('Failed to recalculate pupil status', error)
    throw error
  }

  req.flash('info', `Restart removed for ${pupil.lastName}, ${pupil.foreName}`)
  return res.redirect('/restart/overview')
}

module.exports = controller
