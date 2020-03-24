const gulp = require('gulp')
const replace = require('gulp-string-replace')
const path = require('path')
const fs = require('fs')
const globalDotEnvFile = path.join(__dirname, '..', '.env')

try {
  if (fs.existsSync(globalDotEnvFile)) {
    console.log('globalDotEnvFile found', globalDotEnvFile)
    require('dotenv').config({ path: globalDotEnvFile })
  } else {
    console.log('No .env file found at project root')
  }
} catch (error) {
  console.error(error)
}

gulp.task('setRuntimeConfigURL', () => {
  console.log('Attempting to update runtime config URL from the environment...')
  console.log('env.RUNTIME_CONFIG_URL is:', process.env.RUNTIME_CONFIG_URL)
  if (process.env.RUNTIME_CONFIG_URL) {
    return gulp.src(['./src/app/services/config/config.service.ts'])
      .pipe(replace('/public/config.json', process.env.RUNTIME_CONFIG_URL))
      .pipe(gulp.dest('./src/app/services/config/'))
  }
})

gulp.task('setSecretEnvVars', () => {
  console.log('testPupilConnectionQueueUrlValue is:', process.env.TEST_PUPIL_CONNECTION_QUEUE_URL)
  console.log('testPupilConnectionQueueTokenValue is:', process.env.TEST_PUPIL_CONNECTION_QUEUE_TOKEN)
  console.log('connectivityCheckEnabled is:', process.env.CONNECTIVITY_CHECK_ENABLED)
  console.log('testPupilConnectionDelay is:', process.env.TEST_PUPIL_CONNECTION_ERROR_DELAY)
  console.log('testPupilConnectionMaxAttempts is:', process.env.TEST_PUPIL_CONNECTION_MAX_ATTEMPTS)

  return gulp.src('src/public/config.json')
    .pipe(replace('testPupilConnectionQueueUrlValue', process.env.TEST_PUPIL_CONNECTION_QUEUE_URL || ''))
    .pipe(replace('testPupilConnectionQueueTokenValue', process.env.TEST_PUPIL_CONNECTION_QUEUE_TOKEN || ''))
    .pipe(replace('connectivityCheckEnabled', process.env.CONNECTIVITY_CHECK_ENABLED || false))
    .pipe(replace('testPupilConnectionDelay', process.env.TEST_PUPIL_CONNECTION_ERROR_DELAY || 3000))
    .pipe(replace('testPupilConnectionMaxAttempts', process.env.TEST_PUPIL_CONNECTION_MAX_ATTEMPTS, 1))
    .pipe(gulp.dest('src/public'))
})
