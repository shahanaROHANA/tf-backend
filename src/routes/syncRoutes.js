// Sync Service Routes - Management and monitoring of background sync jobs
import express from 'express';
import { 
  syncJobManager,
  runRegularDataSync,
  refreshStationData,
  refreshRestaurantData,
  cleanupStaleData,
  updateSyncStatistics,
  triggerAreaSync,
  getSyncSystemHealth
} from '../services/syncService.js';

const router = express.Router();

/**
 * GET /api/sync/status
 * Get current status of all sync jobs
 */
router.get('/status', async (req, res) => {
  try {
    const jobStatus = syncJobManager.getJobStatus();
    const systemHealth = await getSyncSystemHealth();
    
    return res.json({
      success: true,
      system: {
        isRunning: syncJobManager.isRunning,
        totalJobs: Object.keys(jobStatus).length,
        uptime: process.uptime()
      },
      jobs: jobStatus,
      health: systemHealth,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Error /api/sync/status:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to get sync status',
      details: err.message || String(err)
    });
  }
});

/**
 * POST /api/sync/start
 * Start all background sync jobs
 */
router.post('/start', async (req, res) => {
  try {
    if (syncJobManager.isRunning) {
      return res.json({
        success: false,
        message: 'Sync jobs are already running'
      });
    }

    await syncJobManager.startAllJobs();
    
    return res.json({
      success: true,
      message: 'All sync jobs started successfully',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Error /api/sync/start:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to start sync jobs',
      details: err.message || String(err)
    });
  }
});

/**
 * POST /api/sync/stop
 * Stop all background sync jobs
 */
router.post('/stop', async (req, res) => {
  try {
    syncJobManager.stopAllJobs();
    
    return res.json({
      success: true,
      message: 'All sync jobs stopped successfully',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Error /api/sync/stop:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to stop sync jobs',
      details: err.message || String(err)
    });
  }
});

/**
 * POST /api/sync/run-now/:jobName
 * Manually trigger a specific sync job
 * Job names: 'regular-sync', 'station-refresh', 'restaurant-refresh', 'data-cleanup', 'stats-update'
 */
router.post('/run-now/:jobName', async (req, res) => {
  try {
    const { jobName } = req.params;
    
    const jobFunctions = {
      'regular-sync': runRegularDataSync,
      'station-refresh': refreshStationData,
      'restaurant-refresh': refreshRestaurantData,
      'data-cleanup': cleanupStaleData,
      'stats-update': updateSyncStatistics
    };

    if (!jobFunctions[jobName]) {
      return res.status(400).json({
        success: false,
        error: 'Invalid job name',
        validJobs: Object.keys(jobFunctions)
      });
    }

    const startTime = Date.now();
    const result = await jobFunctions[jobName]();
    const duration = Date.now() - startTime;

    return res.json({
      success: true,
      jobName,
      result,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error(`Error /api/sync/run-now/${req.params.jobName}:`, err);
    return res.status(500).json({
      success: false,
      error: `Failed to run job ${req.params.jobName}`,
      details: err.message || String(err)
    });
  }
});

/**
 * POST /api/sync/area
 * Trigger sync for a specific geographic area
 * Body: { lat: number, lng: number, radius?: number }
 */
router.post('/area', async (req, res) => {
  try {
    const { lat, lng, radius = 5000 } = req.body;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        error: 'lat and lng are required'
      });
    }

    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return res.status(400).json({
        success: false,
        error: 'lat and lng must be valid numbers'
      });
    }

    if (radius < 100 || radius > 50000) {
      return res.status(400).json({
        success: false,
        error: 'radius must be between 100 and 50000 meters'
      });
    }

    const result = await triggerAreaSync(lat, lng, radius);
    
    return res.json({
      success: true,
      area: { lat, lng, radius },
      result,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Error /api/sync/area:', err);
    return res.status(500).json({
      success: false,
      error: 'Area sync failed',
      details: err.message || String(err)
    });
  }
});

/**
 * GET /api/sync/health
 * Get comprehensive health check of sync system
 */
router.get('/health', async (req, res) => {
  try {
    const health = await getSyncSystemHealth();
    
    // Determine overall health status
    let overallStatus = 'healthy';
    const warnings = [];
    
    if (!syncJobManager.isRunning) {
      overallStatus = 'warning';
      warnings.push('Sync jobs are not running');
    }
    
    const totalJobs = Object.keys(health.jobs || {}).length;
    const failedJobs = Object.values(health.jobs || {}).filter(job => job.errorCount > 0).length;
    
    if (failedJobs > totalJobs * 0.5) {
      overallStatus = 'critical';
      warnings.push('High job failure rate detected');
    }
    
    if (health.database.stations === 0) {
      overallStatus = 'critical';
      warnings.push('No stations found in database');
    }
    
    if (health.database.restaurants === 0) {
      overallStatus = 'critical';
      warnings.push('No restaurants found in database');
    }

    return res.json({
      success: true,
      status: overallStatus,
      health,
      warnings,
      recommendations: health.recommendations || [],
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Error /api/sync/health:', err);
    return res.status(500).json({
      success: false,
      status: 'error',
      error: 'Health check failed',
      details: err.message || String(err)
    });
  }
});

/**
 * GET /api/sync/statistics
 * Get detailed synchronization statistics
 */
router.get('/statistics', async (req, res) => {
  try {
    const { Station, GoogleMapsRestaurant } = await import('../models/googleMapsModel.js');
    
    // Get comprehensive statistics
    const [
      totalStations,
      activeStations,
      totalRestaurants,
      activeRestaurants,
      deliveryEnabledRestaurants,
      recentStationSyncs,
      recentRestaurantSyncs,
      ratingDistribution,
      cuisineDistribution
    ] = await Promise.all([
      Station.countDocuments(),
      Station.countDocuments({ is_active: true }),
      GoogleMapsRestaurant.countDocuments(),
      GoogleMapsRestaurant.countDocuments({ is_active: true }),
      GoogleMapsRestaurant.countDocuments({ 
        is_active: true, 
        'custom_data.delivery_info.delivery_to_train': true 
      }),
      
      // Recent syncs (last 24 hours)
      Station.countDocuments({
        last_synced: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }),
      GoogleMapsRestaurant.countDocuments({
        last_synced: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }),
      
      // Rating distribution
      GoogleMapsRestaurant.aggregate([
        {
          $bucket: {
            groupBy: '$rating',
            boundaries: [0, 1, 2, 3, 4, 5],
            default: 'unrated',
            output: { count: { $sum: 1 } }
          }
        }
      ]),
      
      // Cuisine distribution
      GoogleMapsRestaurant.aggregate([
        { $unwind: '$custom_data.cuisine_tags' },
        {
          $group: {
            _id: '$custom_data.cuisine_tags',
            count: { $sum: 1 },
            avgRating: { $avg: '$rating' }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ])
    ]);

    const statistics = {
      timestamp: new Date().toISOString(),
      data_counts: {
        total_stations: totalStations,
        active_stations: activeStations,
        total_restaurants: totalRestaurants,
        active_restaurants: activeRestaurants,
        delivery_enabled_restaurants: deliveryEnabledRestaurants
      },
      sync_coverage: {
        last_24h_station_syncs: recentStationSyncs,
        last_24h_restaurant_syncs: recentRestaurantSyncs,
        station_sync_coverage: totalStations > 0 ? 
          ((recentStationSyncs / totalStations) * 100).toFixed(1) + '%' : '0%',
        restaurant_sync_coverage: totalRestaurants > 0 ? 
          ((recentRestaurantSyncs / totalRestaurants) * 100).toFixed(1) + '%' : '0%'
      },
      quality_metrics: {
        rating_distribution: ratingDistribution,
        popular_cuisines: cuisineDistribution,
        average_restaurant_rating: cuisineDistribution.length > 0 ?
          (cuisineDistribution.reduce((sum, item) => sum + (item.avgRating || 0), 0) / cuisineDistribution.length).toFixed(2) :
          'N/A'
      },
      system_performance: {
        job_status: syncJobManager.getJobStatus(),
        memory_usage: process.memoryUsage(),
        uptime: process.uptime()
      }
    };

    return res.json({
      success: true,
      statistics,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Error /api/sync/statistics:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to get statistics',
      details: err.message || String(err)
    });
  }
});

/**
 * POST /api/sync/seed-major-stations
 * Seed data for major Sri Lankan train stations
 */
router.post('/seed-major-stations', async (req, res) => {
  try {
    // Major Sri Lankan train stations with approximate coordinates
    const majorStations = [
      { name: 'Colombo Fort', lat: 6.935, lng: 79.852 },
      { name: 'Jaffna', lat: 9.661, lng: 80.025 },
      { name: 'Kandy', lat: 7.293, lng: 80.637 },
      { name: 'Galle', lat: 6.054, lng: 80.221 },
      { name: 'Anuradhapura', lat: 8.311, lng: 80.403 },
      { name: 'Badulla', lat: 6.989, lng: 81.056 },
      { name: 'Ratnapura', lat: 6.705, lng: 80.385 },
      { name: 'Polgahawela', lat: 7.328, lng: 80.127 },
      { name: 'Vauniya', lat: 8.734, lng: 80.548 },
      { name: 'Trincomalee', lat: 8.587, lng: 81.215 }
    ];

    let seededCount = 0;
    const results = [];

    for (const station of majorStations) {
      try {
        const result = await triggerAreaSync(station.lat, station.lng, 2000);
        if (result.success) {
          seededCount++;
          results.push({
            station: station.name,
            coordinates: [station.lat, station.lng],
            ...result
          });
        }
      } catch (stationError) {
        console.warn(`Failed to seed ${station.name}:`, stationError.message);
        results.push({
          station: station.name,
          coordinates: [station.lat, station.lng],
          success: false,
          error: stationError.message
        });
      }
    }

    return res.json({
      success: true,
      message: `Successfully seeded ${seededCount}/${majorStations.length} major stations`,
      summary: {
        total_attempted: majorStations.length,
        successful: seededCount,
        failed: majorStations.length - seededCount
      },
      results,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Error /api/sync/seed-major-stations:', err);
    return res.status(500).json({
      success: false,
      error: 'Seeding failed',
      details: err.message || String(err)
    });
  }
});

/**
 * DELETE /api/sync/cleanup
 * Manual cleanup of old or invalid data
 * Body: { removeInactive?: boolean, removeOldErrors?: boolean }
 */
router.delete('/cleanup', async (req, res) => {
  try {
    const { removeInactive = true, removeOldErrors = true } = req.body;
    
    let cleanupResults = {
      timestamp: new Date().toISOString(),
      actions: []
    };

    if (removeInactive) {
      // Deactivate permanently closed businesses
      const inactiveStations = await Station.updateMany(
        { 'google_data.business_status': 'CLOSED_PERMANENTLY' },
        { $set: { is_active: false } }
      );

      const inactiveRestaurants = await GoogleMapsRestaurant.updateMany(
        { 'google_data.business_status': { $in: ['CLOSED_PERMANENTLY', 'OPERATIONS_SUSPENDED'] } },
        { $set: { is_active: false } }
      );

      cleanupResults.actions.push({
        action: 'remove_inactive',
        stationsDeactivated: inactiveStations.modifiedCount,
        restaurantsDeactivated: inactiveRestaurants.modifiedCount
      });
    }

    if (removeOldErrors) {
      // Clean up old cache entries or temporary data
      // This would be implemented based on your specific data structure
      cleanupResults.actions.push({
        action: 'remove_old_errors',
        cleaned: 0 // Placeholder
      });
    }

    return res.json({
      success: true,
      message: 'Cleanup completed successfully',
      results: cleanupResults,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Error /api/sync/cleanup:', err);
    return res.status(500).json({
      success: false,
      error: 'Cleanup failed',
      details: err.message || String(err)
    });
  }
});

export default router;