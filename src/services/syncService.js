// Background Sync Service - Automated data synchronization and maintenance
import { 
  syncStaleData, 
  getStationsWithRestaurantsFromDB, 
  getPlaceDetailsCached,
  upsertStation,
  upsertRestaurant
} from './googleMapsService.js';
import { Station, GoogleMapsRestaurant as Restaurant } from '../models/googleMapsModel.js';

/**
 * Sync Job Scheduler and Management
 */
class SyncJobManager {
  constructor() {
    this.jobs = new Map();
    this.isRunning = false;
    this.defaultConfig = {
      syncInterval: 24 * 60 * 60 * 1000, // 24 hours
      batchSize: 10,
      retryAttempts: 3,
      timeoutMs: 30000
    };
  }

  /**
   * Start all scheduled sync jobs
   */
  async startAllJobs() {
    if (this.isRunning) {
      console.log('Sync jobs already running');
      return;
    }

    console.log('Starting background sync jobs...');
    this.isRunning = true;

    // Schedule regular data sync
    this.scheduleJob('regular-sync', this.defaultConfig.syncInterval, () => 
      this.runRegularDataSync()
    );

    // Schedule station data refresh (every 12 hours)
    this.scheduleJob('station-refresh', 12 * 60 * 60 * 1000, () => 
      this.refreshStationData()
    );

    // Schedule restaurant data refresh (every 6 hours)
    this.scheduleJob('restaurant-refresh', 6 * 60 * 60 * 1000, () => 
      this.refreshRestaurantData()
    );

    // Schedule data cleanup (daily)
    this.scheduleJob('data-cleanup', 24 * 60 * 60 * 1000, () => 
      this.cleanupStaleData()
    );

    // Schedule statistics update (hourly)
    this.scheduleJob('stats-update', 60 * 60 * 1000, () => 
      this.updateSyncStatistics()
    );

    console.log('All sync jobs scheduled successfully');
  }

  /**
   * Stop all scheduled sync jobs
   */
  stopAllJobs() {
    console.log('Stopping all background sync jobs...');
    this.isRunning = false;
    
    for (const [jobName, job] of this.jobs.entries()) {
      if (job.intervalId) {
        clearInterval(job.intervalId);
        console.log(`Stopped job: ${jobName}`);
      }
    }
    
    this.jobs.clear();
  }

  /**
   * Schedule a new job
   */
  scheduleJob(name, interval, jobFunction) {
    if (this.jobs.has(name)) {
      console.warn(`Job ${name} already exists, replacing...`);
      this.stopJob(name);
    }

    const job = {
      name,
      interval,
      function: jobFunction,
      intervalId: null,
      lastRun: null,
      runCount: 0,
      successCount: 0,
      errorCount: 0,
      lastError: null
    };

    // Run immediately, then on schedule
    jobFunction().catch(err => console.error(`Initial run failed for job ${name}:`, err));

    job.intervalId = setInterval(async () => {
      if (this.isRunning) {
        await this.runJob(job);
      }
    }, interval);

    this.jobs.set(name, job);
    console.log(`Scheduled job: ${name} (interval: ${interval}ms)`);
  }

  /**
   * Stop a specific job
   */
  stopJob(name) {
    const job = this.jobs.get(name);
    if (job) {
      if (job.intervalId) {
        clearInterval(job.intervalId);
        this.jobs.delete(name);
        console.log(`Stopped job: ${name}`);
      }
    }
  }

  /**
   * Run a specific job with error handling and logging
   */
  async runJob(job) {
    console.log(`Running job: ${job.name}...`);
    const startTime = Date.now();

    try {
      job.lastRun = new Date();
      job.runCount++;
      
      await job.function();
      
      job.successCount++;
      const duration = Date.now() - startTime;
      console.log(`Job ${job.name} completed successfully in ${duration}ms`);
      
    } catch (error) {
      job.errorCount++;
      job.lastError = error.message;
      console.error(`Job ${job.name} failed:`, error);
      
      // Implement exponential backoff for failed jobs
      if (job.errorCount % 3 === 0) {
        console.log(`Job ${job.name} failing frequently, increasing interval...`);
        this.adjustJobInterval(job);
      }
    }
  }

  /**
   * Adjust job interval based on failure rate
   */
  adjustJobInterval(job) {
    const failureRate = job.errorCount / job.runCount;
    if (failureRate > 0.3) {
      // Reduce frequency for frequently failing jobs
      const newInterval = Math.min(job.interval * 2, 7 * 24 * 60 * 60 * 1000); // Max 7 days
      clearInterval(job.intervalId);
      job.interval = newInterval;
      job.intervalId = setInterval(async () => {
        if (this.isRunning) {
          await this.runJob(job);
        }
      }, newInterval);
      console.log(`Adjusted ${job.name} interval to ${newInterval}ms due to high failure rate`);
    }
  }

  /**
   * Get job status and statistics
   */
  getJobStatus() {
    const status = {};
    for (const [name, job] of this.jobs.entries()) {
      status[name] = {
        lastRun: job.lastRun,
        runCount: job.runCount,
        successCount: job.successCount,
        errorCount: job.errorCount,
        successRate: job.runCount > 0 ? (job.successCount / job.runCount * 100).toFixed(1) + '%' : '0%',
        lastError: job.lastError,
        interval: job.interval
      };
    }
    return status;
  }
}

/**
 * Regular data synchronization job
 */
async function runRegularDataSync() {
  console.log('Starting regular data sync...');
  
  try {
    const startTime = Date.now();
    
    // Sync stale data using the existing function
    await syncStaleData(24); // Sync data older than 24 hours
    
    const duration = Date.now() - startTime;
    console.log(`Regular data sync completed in ${duration}ms`);
    
    return {
      success: true,
      duration,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('Regular data sync failed:', error);
    throw error;
  }
}

/**
 * Refresh station data specifically
 */
async function refreshStationData() {
  console.log('Refreshing station data...');
  
  try {
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - 12); // 12 hours old
    
    // Find stale stations
    const staleStations = await Station.find({
      last_synced: { $lt: cutoffDate },
      is_active: true
    }).limit(20); // Limit to prevent API overload
    
    console.log(`Found ${staleStations.length} stale stations to refresh`);
    
    let refreshed = 0;
    for (const station of staleStations) {
      try {
        // Get fresh details from Google Places
        const details = await getPlaceDetailsCached(station.place_id);
        
        if (details) {
          // Update station with fresh data
          await Station.findOneAndUpdate(
            { place_id: station.place_id },
            {
              $set: {
                'google_data.business_status': details.business_status,
                'google_data.opening_hours': details.opening_hours,
                'google_data.rating': details.rating,
                'google_data.user_ratings_total': details.user_ratings_total,
                last_synced: new Date()
              }
            }
          );
          refreshed++;
        }
      } catch (detailError) {
        console.warn(`Failed to refresh station ${station.name}:`, detailError.message);
      }
    }
    
    console.log(`Refreshed ${refreshed}/${staleStations.length} stations`);
    
    return {
      success: true,
      totalFound: staleStations.length,
      refreshed,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('Station data refresh failed:', error);
    throw error;
  }
}

/**
 * Refresh restaurant data specifically
 */
async function refreshRestaurantData() {
  console.log('Refreshing restaurant data...');
  
  try {
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - 6); // 6 hours old
    
    // Find stale restaurants
    const staleRestaurants = await Restaurant.find({
      last_synced: { $lt: cutoffDate },
      is_active: true,
      'custom_data.delivery_info.delivery_to_train': true
    }).limit(30); // Limit to prevent API overload
    
    console.log(`Found ${staleRestaurants.length} stale restaurants to refresh`);
    
    let refreshed = 0;
    for (const restaurant of staleRestaurants) {
      try {
        // Get fresh details from Google Places
        const details = await getPlaceDetailsCached(restaurant.place_id);
        
        if (details) {
          // Update restaurant with fresh data
          await Restaurant.findOneAndUpdate(
            { place_id: restaurant.place_id },
            {
              $set: {
                'google_data.business_status': details.business_status,
                'google_data.opening_hours': details.opening_hours,
                'google_data.rating': details.rating,
                'google_data.user_ratings_total': details.user_ratings_total,
                last_synced: new Date()
              }
            }
          );
          refreshed++;
        }
      } catch (detailError) {
        console.warn(`Failed to refresh restaurant ${restaurant.name}:`, detailError.message);
      }
    }
    
    console.log(`Refreshed ${refreshed}/${staleRestaurants.length} restaurants`);
    
    return {
      success: true,
      totalFound: staleRestaurants.length,
      refreshed,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('Restaurant data refresh failed:', error);
    throw error;
  }
}

/**
 * Clean up stale and invalid data
 */
async function cleanupStaleData() {
  console.log('Starting data cleanup...');
  
  try {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    // Find and deactivate closed businesses
    const closedStations = await Station.updateMany(
      {
        'google_data.business_status': 'CLOSED_PERMANENTLY',
        is_active: true
      },
      {
        $set: { is_active: false }
      }
    );
    
    const closedRestaurants = await Restaurant.updateMany(
      {
        'google_data.business_status': { $in: ['CLOSED_PERMANENTLY', 'OPERATIONS_SUSPENDED'] },
        is_active: true
      },
      {
        $set: { is_active: false }
      }
    );
    
    // Clean up old error logs (keep last 100 entries per type)
    const cleanupResults = {
      closedStations: closedStations.modifiedCount,
      closedRestaurants: closedRestaurants.modifiedCount,
      timestamp: new Date().toISOString()
    };
    
    console.log('Data cleanup completed:', cleanupResults);
    
    return cleanupResults;
    
  } catch (error) {
    console.error('Data cleanup failed:', error);
    throw error;
  }
}

/**
 * Update synchronization statistics
 */
async function updateSyncStatistics() {
  console.log('Updating sync statistics...');
  
  try {
    const stats = {
      timestamp: new Date().toISOString(),
      stations: {
        total: await Station.countDocuments({ is_active: true }),
        syncedLast24h: await Station.countDocuments({
          is_active: true,
          last_synced: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        }),
        stale: await Station.countDocuments({
          is_active: true,
          last_synced: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        })
      },
      restaurants: {
        total: await Restaurant.countDocuments({ is_active: true }),
        syncedLast24h: await Restaurant.countDocuments({
          is_active: true,
          last_synced: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        }),
        stale: await Restaurant.countDocuments({
          is_active: true,
          last_synced: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        }),
        deliveryEnabled: await Restaurant.countDocuments({
          is_active: true,
          'custom_data.delivery_info.delivery_to_train': true
        })
      },
      syncHealth: {
        lastFullSync: new Date().toISOString(),
        apiQuotaUsed: 'calculated externally',
        errorRate: 'calculated externally'
      }
    };
    
    // In a real implementation, you might store these statistics in a separate collection
    console.log('Sync statistics updated:', stats);
    
    return stats;
    
  } catch (error) {
    console.error('Failed to update sync statistics:', error);
    throw error;
  }
}

/**
 * Manual trigger for immediate sync of specific area
 */
async function triggerAreaSync(lat, lng, radius = 5000) {
  console.log(`Triggering manual sync for area: ${lat}, ${lng}, radius: ${radius}m`);
  
  try {
    const result = await getStationsWithRestaurantsFromDB({
      lat,
      lng,
      stationRadius: radius,
      stationLimit: 10,
      restaurantRadius: Math.min(radius, 1000),
      restaurantLimit: 50,
      forceRefresh: true
    });
    
    console.log('Area sync completed:', {
      stationsFound: result.stations.length,
      totalRestaurants: result.stations.reduce((sum, s) => sum + s.restaurants.length, 0),
      dataSource: result.dataSource
    });
    
    return {
      success: true,
      stationsFound: result.stations.length,
      totalRestaurants: result.stations.reduce((sum, s) => sum + s.restaurants.length, 0),
      dataSource: result.dataSource,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('Area sync failed:', error);
    throw error;
  }
}

/**
 * Health check for sync system
 */
async function getSyncSystemHealth() {
  const jobManager = new SyncJobManager();
  const jobStatus = jobManager.getJobStatus();
  
  const health = {
    timestamp: new Date().toISOString(),
    systemStatus: jobManager.isRunning ? 'running' : 'stopped',
    jobs: jobStatus,
    database: {
      stationCount: await Station.countDocuments(),
      restaurantCount: await Restaurant.countDocuments(),
      activeStations: await Station.countDocuments({ is_active: true }),
      activeRestaurants: await Restaurant.countDocuments({ is_active: true })
    },
    recommendations: []
  };
  
  // Generate recommendations based on health metrics
  const totalJobs = Object.keys(jobStatus).length;
  const failedJobs = Object.values(jobStatus).filter(job => job.errorCount > 0).length;
  
  if (failedJobs > totalJobs * 0.5) {
    health.recommendations.push('High job failure rate detected. Consider checking API quotas and network connectivity.');
  }
  
  if (health.database.stations === 0) {
    health.recommendations.push('No stations found in database. Initial data seeding may be required.');
  }
  
  return health;
}

// Export the sync job manager and functions
export const syncJobManager = new SyncJobManager();
export {
  runRegularDataSync,
  refreshStationData,
  refreshRestaurantData,
  cleanupStaleData,
  updateSyncStatistics,
  triggerAreaSync,
  getSyncSystemHealth
};