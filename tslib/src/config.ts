import * as path from 'path'
import * as fs from 'fs'
// @ts-ignore
import * as dotenv from 'dotenv'
const globalDotEnvFile = path.join(__dirname, '..', '..', '.env')
try {
  if (fs.existsSync(globalDotEnvFile)) {
    // console.log('globalDotEnvFile found', globalDotEnvFile)
    dotenv.config({ path: globalDotEnvFile })
  } else {
    console.log('No .env file found at project root')
  }
} catch (error) {
  console.error(error)
}
import * as toBool from './common/to-bool'
import * as schoolResultsCacheDeterminerConfig from './functions/school-results-cache-determiner/config'

const getEnvironment = () => {
  return process.env.ENVIRONMENT_NAME || 'Local-Dev'
}

const oneMinuteInMilliseconds = 60000
const sixMonthsInSeconds = 15778800

function optionalValueParser (input: any, substitute: number): string {
  if (input) {
    return input
  }
  return substitute.toString()
}

export default {
  Environment: getEnvironment(),
  Sql: {
    user: process.env.SQL_APP_USER || 'mtcAdminUser', // docker default
    password: process.env.SQL_APP_USER_PASSWORD || 'your-chosen*P4ssw0rd_for_dev_env!', // docker default
    server: process.env.SQL_SERVER || 'localhost',
    port: parseInt(optionalValueParser(process.env.SQL_PORT, 1433), 10),
    database: process.env.SQL_DATABASE || 'mtc',
    connectionTimeout: parseInt(optionalValueParser(process.env.SQL_CONNECTION_TIMEOUT, oneMinuteInMilliseconds), 10),
    requestTimeout: parseInt(optionalValueParser(process.env.SQL_REQUEST_TIMEOUT,oneMinuteInMilliseconds), 10),
    options: {
      encrypt: process.env.hasOwnProperty('SQL_ENCRYPT') ? toBool.primitiveToBoolean(process.env.SQL_ENCRYPT) : true,
      useUTC: true,
      appName: process.env.SQL_APP_NAME || 'mtc-local-dev', // docker default
      enableArithAbort: {}.hasOwnProperty.call(process.env, 'SQL_ENABLE_ARITH_ABORT') ? toBool.primitiveToBoolean(process.env.SQL_ENABLE_ARITH_ABORT) : true
    },
    Pooling: {
      MinCount: Number(process.env.SQL_POOL_MIN_COUNT) || 5,
      MaxCount: Number(process.env.SQL_POOL_MAX_COUNT) || 10,
      LoggingEnabled: process.env.hasOwnProperty('SQL_POOL_LOG_ENABLED') ? toBool.primitiveToBoolean(process.env.SQL_POOL_LOG_ENABLED) : true
    }
  },
  DatabaseRetry: {
    MaxRetryAttempts: parseInt(optionalValueParser(process.env.RETRY_MAX_ATTEMPTS, 3), 10),
    InitialPauseMs: parseInt(optionalValueParser(process.env.RETRY_PAUSE_MS, 5000), 10),
    PauseMultiplier: parseFloat(optionalValueParser(process.env.RETRY_PAUSE_MULTIPLIER, 1.5))
  },
  Redis: {
    Host: process.env.REDIS_HOST || 'localhost',
    Port: Number(process.env.REDIS_PORT) || 6379,
    Key: process.env.REDIS_KEY,
    useTLS: getEnvironment() === 'Local-Dev' ? false : true
  },
  CheckAllocation: {
    ExpiryTimeInSeconds: Number(process.env.CHECK_ALLOCATION_EXPIRY_SECONDS) || 15778476 // 6 months
  },
  PupilAuth: {
    PreparedCheckExpiryAfterLoginSeconds: parseInt(optionalValueParser(process.env.PREPARED_CHECK_EXPIRY_SECONDS, 1800), 10),
    CorsWhitelist: process.env.CORS_WHITELIST || ''
  },
  ServiceBus: {
    ConnectionString: process.env.AZURE_SERVICE_BUS_CONNECTION_STRING
  },
  CheckNotifier: {
    MessagesPerBatch: parseInt(optionalValueParser(process.env.CHECK_NOTIFIER_MESSAGES_PER_BATCH, 32), 10),
    BatchesPerExecution: parseInt(optionalValueParser(process.env.CHECK_NOTIFIER_BATCH_COUNT, 5), 10)
  },
  SchoolPinGenerator: {
    AllowedWords: process.env.ALLOWED_WORDS || 'aaa,bbb,ccc,ddd,eee,dim',
    BannedWords: process.env.BANNED_WORDS || 'dim',
    OverridePinExpiry: {}.hasOwnProperty.call(process.env, 'OVERRIDE_PIN_EXPIRY') ? toBool.primitiveToBoolean(process.env.OVERRIDE_PIN_EXPIRY) : false,
    PinUpdateMaxAttempts: parseInt(optionalValueParser(process.env.PIN_UPDATE_MAX_ATTEMPTS,0), 10),
    DigitChars: '23456789'
  },
  SchoolResultsCacheDeterminer: {
    cache: Number(process.env.SCHOOL_RESULTS_CACHE) || schoolResultsCacheDeterminerConfig.cache.cacheIfInDate
  },
  SchoolResultsCache: {
    BatchesPerExecution: Number(process.env.SCHOOL_RESULTS_CACHE_BATCHS_PER_EXEC) || 10,
    MessagesPerBatch: Number(process.env.SCHOOL_RESULTS_CACHE_MSGS_PER_BATCH) || 32,
    RedisResultsExpiryInSeconds: Number(process.env.REDIS_RESULTS_EXPIRY_IN_SECONDS) || sixMonthsInSeconds
  }
}
