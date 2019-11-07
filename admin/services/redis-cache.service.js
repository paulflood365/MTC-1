const Redis = require('ioredis')
const config = require('../config')
const logger = require('./log.service').getLogger()

const redisConfig = {
  port: config.Redis.Port,
  host: config.Redis.Host
}
if (config.Redis.Key) {
  redisConfig.password = config.Redis.Key
}
if (config.Redis.useTLS) {
  redisConfig.tls = { host: config.Redis.Host }
}

let redis

const redisConnect = () => {
  if (!redis) {
    redis = new Redis(redisConfig)
  }
}

const redisCacheService = {}

/**
 * Returns the data from a Redis key entry
 * @param redisKey - the full Redis key to get
 * @returns {Promise<any>}
 */
redisCacheService.get = async redisKey => {
  redisConnect()
  try {
    const result = await redis.get(redisKey)
    if (!result) {
      logger.info(`REDIS (get): \`${redisKey}\` is not set`)
      return false
    }
    logger.info(`REDIS (get): Retrieved \`${redisKey}\``)
    return result
  } catch (err) {
    logger.error(`REDIS (get): Error getting \`redisKey\`: ${err.message}`)
    throw err
  }
}

/**
 * Stores data for a Redis key
 * @param redisKey - the full Redis key to set
 * @param data - string data to insert
 * @returns {Promise<Boolean>}
 */
redisCacheService.set = async (redisKey, data) => {
  redisConnect()
  try {
    if (typeof data === 'object') {
      data = JSON.stringify(data)
    }
    await redis.set(redisKey, data)
    logger.info(`REDIS (set): Stored \`${redisKey}\``)
    return true
  } catch (err) {
    logger.error(`REDIS (set): Error setting \`redisKey\`: ${err.message}`)
    throw err
  }
}

/**
 * Drops any supplied caches - so they can be re-queried
 * @param caches - A single string or array of strings
 * @returns {Promise<Boolean>}
 */
redisCacheService.drop = async (caches = []) => {
  if (Array.isArray(caches) && caches.length === 0) {
    return false
  }
  redisConnect()
  if (typeof caches === 'string') {
    caches = [caches]
  }
  const pipeline = redis.pipeline()
  caches.forEach(c => {
    pipeline.del(c)
  })
  await pipeline.exec()
  logger.info(`REDIS (drop): Dropped \`${caches.join('`, `')}\``)
  return true
}

/**
 * @description set many items in one atomic operation, with optional expiry
 * @param {[{key:string, value:object, ttl:number | undefined}]} items a dictionary of items to add to redis
 * @returns {Promise<void>}
 */
redisCacheService.setMany = async (items) => {
  if (!Array.isArray(items)) {
    throw new Error('items is not an array')
  }
  redisConnect()
  const multi = redis.multi()
  for (let index = 0; index < items.length; index++) {
    const item = items[index]
    if (typeof item.value === 'object') {
      item.value = JSON.stringify(item.value)
    }
    if (item.ttl !== undefined) {
      logger.info(`REDIS (multi:setex): adding ${item.key} ttl:${item.ttl}`)
      multi.setex(item.key, item.ttl, item.value)
    } else {
      multi.set(item.key, item.value)
    }
  }
  logger.info('REDIS (multi:exec)')
  return multi.exec()
}

module.exports = redisCacheService
