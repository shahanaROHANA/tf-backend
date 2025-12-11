// Seed script for Jaffna region stations with specific restaurant availability
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Import models (adjust path as needed)
import { Station } from './src/models/googleMapsModel.js';

// Load environment variables
dotenv.config();

const mongodbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/trainfood';

async function seedJaffnaStations() {
  try {
    await mongoose.connect(mongodbUri);
    console.log('Connected to MongoDB');

    // Clear existing Jaffna region stations to avoid duplicates
    await Station.deleteMany({ 
      name: { 
        $in: ['Kaithady Station', 'Navatkuli Station', 'Chavakachcheri Station', 'Meesalai Station', 'Sangaththanai Station', 'Kodikamam Station', 'Mirusuvil Station', 'Eluthumadduval Station']
      }
    });
    console.log('Cleared existing Jaffna stations');

    // Define Jaffna region stations with coordinates and restaurant availability
    const jaffnaStations = [
      {
        place_id: 'jaffna_station_001',
        name: 'Kaithady Station',
        location: {
          type: 'Point',
          coordinates: [80.0857, 9.7206] // [lng, lat]
        },
        vicinity: 'Kaithady, Jaffna',
        types: ['train_station'],
        tags: ['train_station', 'jaffna_region', 'no_food_available'],
        rating: 3.5,
        user_ratings_total: 45,
        google_data: {
          place_id: 'jaffna_station_001',
          formatted_address: 'Kaithady, Jaffna, Sri Lanka',
          geometry: {
            location: { lat: 9.7206, lng: 80.0857 }
          },
          business_status: 'OPERATIONAL'
        },
        custom_data: {
          train_lines: ['Northern Line'],
          platform_info: '1 platform',
          facilities: ['platform', 'shelter'],
          accessibility_features: ['ramp_access']
        },
        is_active: true
      },
      {
        place_id: 'jaffna_station_002',
        name: 'Navatkuli Station',
        location: {
          type: 'Point',
          coordinates: [80.1234, 9.7456] // [lng, lat]
        },
        vicinity: 'Navatkuli, Jaffna',
        types: ['train_station'],
        tags: ['train_station', 'jaffna_region', 'no_food_available'],
        rating: 3.2,
        user_ratings_total: 32,
        google_data: {
          place_id: 'jaffna_station_002',
          formatted_address: 'Navatkuli, Jaffna, Sri Lanka',
          geometry: {
            location: { lat: 9.7456, lng: 80.1234 }
          },
          business_status: 'OPERATIONAL'
        },
        custom_data: {
          train_lines: ['Northern Line'],
          platform_info: '1 platform',
          facilities: ['platform', 'shelter'],
          accessibility_features: ['ramp_access']
        },
        is_active: true
      },
      {
        place_id: 'jaffna_station_003',
        name: 'Chavakachcheri Station',
        location: {
          type: 'Point',
          coordinates: [80.1456, 9.7789] // [lng, lat]
        },
        vicinity: 'Chavakachcheri, Jaffna',
        types: ['train_station'],
        tags: ['train_station', 'jaffna_region', 'food_available'],
        rating: 4.1,
        user_ratings_total: 89,
        google_data: {
          place_id: 'jaffna_station_003',
          formatted_address: 'Chavakachcheri, Jaffna, Sri Lanka',
          geometry: {
            location: { lat: 9.7789, lng: 80.1456 }
          },
          business_status: 'OPERATIONAL'
        },
        custom_data: {
          train_lines: ['Northern Line'],
          platform_info: '2 platforms',
          facilities: ['platform', 'shelter', 'waiting_room', 'food_court'],
          accessibility_features: ['ramp_access', 'signage']
        },
        is_active: true
      },
      {
        place_id: 'jaffna_station_004',
        name: 'Meesalai Station',
        location: {
          type: 'Point',
          coordinates: [80.1678, 9.8123] // [lng, lat]
        },
        vicinity: 'Meesalai, Jaffna',
        types: ['train_station'],
        tags: ['train_station', 'jaffna_region', 'food_available'],
        rating: 4.0,
        user_ratings_total: 67,
        google_data: {
          place_id: 'jaffna_station_004',
          formatted_address: 'Meesalai, Jaffna, Sri Lanka',
          geometry: {
            location: { lat: 9.8123, lng: 80.1678 }
          },
          business_status: 'OPERATIONAL'
        },
        custom_data: {
          train_lines: ['Northern Line'],
          platform_info: '2 platforms',
          facilities: ['platform', 'shelter', 'waiting_room', 'food_court'],
          accessibility_features: ['ramp_access', 'signage']
        },
        is_active: true
      },
      {
        place_id: 'jaffna_station_005',
        name: 'Sangaththanai Station',
        location: {
          type: 'Point',
          coordinates: [80.1890, 9.8456] // [lng, lat]
        },
        vicinity: 'Sangaththanai, Jaffna',
        types: ['train_station'],
        tags: ['train_station', 'jaffna_region', 'food_available'],
        rating: 3.9,
        user_ratings_total: 54,
        google_data: {
          place_id: 'jaffna_station_005',
          formatted_address: 'Sangaththanai, Jaffna, Sri Lanka',
          geometry: {
            location: { lat: 9.8456, lng: 80.1890 }
          },
          business_status: 'OPERATIONAL'
        },
        custom_data: {
          train_lines: ['Northern Line'],
          platform_info: '2 platforms',
          facilities: ['platform', 'shelter', 'waiting_room', 'food_court'],
          accessibility_features: ['ramp_access', 'signage']
        },
        is_active: true
      },
      {
        place_id: 'jaffna_station_006',
        name: 'Kodikamam Station',
        location: {
          type: 'Point',
          coordinates: [80.2102, 9.8789] // [lng, lat]
        },
        vicinity: 'Kodikamam, Jaffna',
        types: ['train_station'],
        tags: ['train_station', 'jaffna_region', 'food_available'],
        rating: 4.2,
        user_ratings_total: 78,
        google_data: {
          place_id: 'jaffna_station_006',
          formatted_address: 'Kodikamam, Jaffna, Sri Lanka',
          geometry: {
            location: { lat: 9.8789, lng: 80.2102 }
          },
          business_status: 'OPERATIONAL'
        },
        custom_data: {
          train_lines: ['Northern Line'],
          platform_info: '2 platforms',
          facilities: ['platform', 'shelter', 'waiting_room', 'food_court'],
          accessibility_features: ['ramp_access', 'signage']
        },
        is_active: true
      },
      {
        place_id: 'jaffna_station_007',
        name: 'Mirusuvil Station',
        location: {
          type: 'Point',
          coordinates: [80.2314, 9.9123] // [lng, lat]
        },
        vicinity: 'Mirusuvil, Jaffna',
        types: ['train_station'],
        tags: ['train_station', 'jaffna_region', 'no_food_available'],
        rating: 3.7,
        user_ratings_total: 41,
        google_data: {
          place_id: 'jaffna_station_007',
          formatted_address: 'Mirusuvil, Jaffna, Sri Lanka',
          geometry: {
            location: { lat: 9.9123, lng: 80.2314 }
          },
          business_status: 'OPERATIONAL'
        },
        custom_data: {
          train_lines: ['Northern Line'],
          platform_info: '1 platform',
          facilities: ['platform', 'shelter'],
          accessibility_features: ['ramp_access']
        },
        is_active: true
      },
      {
        place_id: 'jaffna_station_008',
        name: 'Eluthumadduval Station',
        location: {
          type: 'Point',
          coordinates: [80.2526, 9.9456] // [lng, lat]
        },
        vicinity: 'Eluthumadduval, Jaffna',
        types: ['train_station'],
        tags: ['train_station', 'jaffna_region', 'no_food_available'],
        rating: 3.4,
        user_ratings_total: 28,
        google_data: {
          place_id: 'jaffna_station_008',
          formatted_address: 'Eluthumadduval, Jaffna, Sri Lanka',
          geometry: {
            location: { lat: 9.9456, lng: 80.2526 }
          },
          business_status: 'OPERATIONAL'
        },
        custom_data: {
          train_lines: ['Northern Line'],
          platform_info: '1 platform',
          facilities: ['platform', 'shelter'],
          accessibility_features: ['ramp_access']
        },
        is_active: true
      }
    ];

    // Insert all stations
    const createdStations = await Station.insertMany(jaffnaStations);
    console.log(`Successfully seeded ${createdStations.length} Jaffna region stations`);

    // Log food availability status
    const foodAvailableStations = createdStations.filter(station => 
      station.tags.includes('food_available')
    );
    const noFoodStations = createdStations.filter(station => 
      station.tags.includes('no_food_available')
    );

    console.log('\n📍 Stations WITH food available:');
    foodAvailableStations.forEach(station => {
      console.log(`  ✅ ${station.name}`);
    });

    console.log('\n📍 Stations WITHOUT food available:');
    noFoodStations.forEach(station => {
      console.log(`  ❌ ${station.name}`);
    });

    console.log('\n🎯 Total stations seeded:', createdStations.length);

  } catch (error) {
    console.error('Error seeding Jaffna stations:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
  }
}

// Run the seeding script
seedJaffnaStations();

