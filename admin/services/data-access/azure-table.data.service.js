'use strict'

const { TableClient } = require('@azure/data-tables')
const config = require('../../config')

const connectionString = config.AZURE_STORAGE_CONNECTION_STRING

const service = {
  retrieveEntity: async function retrieveEntity (tableName, partitionKey, rowKey) {
    const client = TableClient.fromConnectionString(connectionString, tableName)
    try {
      const entity = await client.getEntity(partitionKey, rowKey)
      return entity
    } catch (error) {
      if (error.details.odataError.code === 'ResourceNotFound') {
        throw new Error(`entity not found with PartitionKey:${partitionKey} rowKey:${rowKey}`)
      } else {
        throw error
      }
    }
  },

  createTables: async function createTables (tables) {
    const tableCreates = tables.map(table => {
      const tableClient = TableClient.fromConnectionString(connectionString, table)
      return tableClient.createTable(table)
    })
    return Promise.all(tableCreates)
  }
}

module.exports = service
