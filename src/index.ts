#!/usr/bin/env node

import { Command } from 'commander';
import { execSync } from 'child_process';
import { login, logout, isLoggedIn, loadToken } from './auth.js';
import {
  getHotelSearchTags,
  searchHotels,
  getHotelDetail,
  hotelPriceConfirm,
  createHotelBooking,
  searchHotelOrders,
} from './api.js';
import { DEFAULTS, PLACE_TYPES } from './constants.js';
import { checkForUpdates } from './version-check.js';
import pkg from '../package.json' with { type: 'json' };

// Execute version check
await checkForUpdates();

const program = new Command();

program
  .name('rgg')
  .description('RollingGo Hotel CLI - OAuth Login & Booking Workflow')
  .version(pkg.version);

// ==================== Auth Commands ====================

program
  .command('login')
  .description('OAuth Login')
  .action(async () => {
    try {
      await login();
    } catch (error: any) {
      console.error('Login failed:', error.message);
      process.exit(1);
    }
  });

program
  .command('logout')
  .description('Log out')
  .action(() => {
    logout();
  });

program
  .command('whoami')
  .description('Check current login status')
  .action(() => {
    if (isLoggedIn()) {
      const token = loadToken();
      console.log('Logged in');
      if (token?.user) {
        console.log(`   User: ${token.user}`);
      }
    } else {
      console.log('Not logged in. Please run "rgg login" first.');
    }
  });

// ==================== Hotel Commands ====================

// 1. Get search tags
program
  .command('hotel-tags')
  .description('Get all available hotel search tags')
  .action(async () => {
    try {
      const result = await getHotelSearchTags();
      console.log(JSON.stringify(result, null, 2));
    } catch (error: any) {
      console.error('Failed to get tags:', error.message);
      process.exit(1);
    }
  });

// 2. Search hotels
program
  .command('search-hotels')
  .description('Search hotels')
  .requiredOption('--origin-query <query>', 'Original user query')
  .requiredOption('--place <place>', 'Place name')
  .requiredOption('--place-type <type>', `Place type: ${PLACE_TYPES.join('/')}`)
  .option('--country-code <code>', 'Country code')
  .option('--size <n>', 'Response size', String(DEFAULTS.SIZE))
  .option('--check-in-date <date>', 'Check-in date YYYY-MM-DD')
  .option('--stay-nights <n>', 'Stay nights', String(DEFAULTS.STAY_NIGHTS))
  .option('--adult-count <n>', 'Adults per room', String(DEFAULTS.ADULT_COUNT))
  .option('--star-ratings <min,max>', 'Star ratings range (e.g. 3,5)')
  .option('--distance-in-meter <m>', 'Distance limit (meters)')
  .option('--required-tag <tag>', 'Required tag (can be used multiple times)')
  .option('--preferred-brand <brand>', 'Preferred brand (can be used multiple times)')
  .option('--max-price-per-night <price>', 'Max price per night')
  .action(async (options) => {
    try {
      const params: any = {
        originQuery: options.originQuery,
        place: options.place,
        placeType: options.placeType,
      };

      if (options.countryCode) params.countryCode = options.countryCode;
      if (options.size) params.size = parseInt(options.size);

      if (options.checkInDate || options.stayNights || options.adultCount) {
        params.checkInParam = {};
        if (options.checkInDate) params.checkInParam.checkInDate = options.checkInDate;
        if (options.stayNights) params.checkInParam.stayNights = parseInt(options.stayNights);
        if (options.adultCount) params.checkInParam.adultCount = parseInt(options.adultCount);
      }

      if (options.starRatings || options.distanceInMeter) {
        params.filterOptions = {};
        if (options.starRatings) {
          const [min, max] = options.starRatings.split(',').map(Number);
          params.filterOptions.starRatings = [min, max];
        }
        if (options.distanceInMeter) params.filterOptions.distanceInMeter = parseInt(options.distanceInMeter);
      }

      // Collect requiredTags and preferredBrands (support multiple)
      const requiredTags = options.requiredTag
        ? Array.isArray(options.requiredTag)
          ? options.requiredTag
          : [options.requiredTag]
        : [];

      const preferredBrands = options.preferredBrand
        ? Array.isArray(options.preferredBrand)
          ? options.preferredBrand
          : [options.preferredBrand]
        : [];

      if (requiredTags.length || preferredBrands.length || options.maxPricePerNight) {
        params.hotelTags = {};
        if (requiredTags.length) params.hotelTags.requiredTags = requiredTags;
        if (preferredBrands.length) params.hotelTags.preferredBrands = preferredBrands;
        if (options.maxPricePerNight) params.hotelTags.maxPricePerNight = parseFloat(options.maxPricePerNight);
      }

      const result = await searchHotels(params);
      console.log(JSON.stringify(result, null, 2));
    } catch (error: any) {
      console.error('Search failed:', error.message);
      process.exit(1);
    }
  });

// 3. Hotel detail
program
  .command('hotel-detail')
  .description('Query hotel details and room rates')
  .option('--hotel-id <id>', 'Hotel ID')
  .option('--name <name>', 'Hotel name (fuzzy match)')
  .option('--check-in-date <date>', 'Check-in date YYYY-MM-DD')
  .option('--check-out-date <date>', 'Check-out date YYYY-MM-DD')
  .option('--room-count <n>', 'Room count', String(DEFAULTS.ROOM_COUNT))
  .option('--adult-count <n>', 'Adults per room', String(DEFAULTS.ADULT_COUNT))
  .option('--child-count <n>', 'Children per room', String(DEFAULTS.CHILD_COUNT))
  .option('--child-age <ages>', 'Child ages (comma separated)')
  .option('--country-code <code>', 'Country code', DEFAULTS.COUNTRY_CODE)
  .option('--currency <currency>', 'Currency', DEFAULTS.CURRENCY)
  .action(async (options) => {
    try {
      if (!options.hotelId && !options.name) {
        console.error('Please provide --hotel-id or --name');
        process.exit(1);
      }

      const params: any = {};
      if (options.hotelId) params.hotelId = parseInt(options.hotelId);
      if (options.name) params.name = options.name;

      if (options.checkInDate || options.checkOutDate) {
        params.dateParam = {};
        if (options.checkInDate) params.dateParam.checkInDate = options.checkInDate;
        if (options.checkOutDate) params.dateParam.checkOutDate = options.checkOutDate;
      }

      params.occupancyParam = {
        roomCount: parseInt(options.roomCount),
        adultCount: parseInt(options.adultCount),
        childCount: parseInt(options.childCount),
      };

      if (options.childAge) {
        params.occupancyParam.childAgeDetails = options.childAge.split(',').map(Number);
      }

      params.localeParam = {
        countryCode: options.countryCode,
        currency: options.currency,
      };

      const result = await getHotelDetail(params);
      console.log(JSON.stringify(result, null, 2));
    } catch (error: any) {
      console.error('Failed to get hotel details:', error.message);
      process.exit(1);
    }
  });

// 4. Price confirm
program
  .command('price-confirm')
  .description('Lock real-time room price')
  .requiredOption('--hotel-id <id>', 'Hotel ID')
  .requiredOption('--rate-plan-id <id>', 'Rate plan ID')
  .requiredOption('--rooms <n>', 'Number of rooms')
  .requiredOption('--check-in-date <date>', 'Check-in date YYYY-MM-DD')
  .requiredOption('--check-out-date <date>', 'Check-out date YYYY-MM-DD')
  .requiredOption('--adults <n>', 'Adults per room')
  .option('--children <n>', 'Children per room', String(DEFAULTS.CHILD_COUNT))
  .option('--child-age <ages>', 'Child ages (comma separated)')
  .option('--nationality <code>', 'Nationality code', DEFAULTS.NATIONALITY)
  .option('--currency <currency>', 'Currency', DEFAULTS.CURRENCY)
  .action(async (options) => {
    try {
      const numOfRooms = parseInt(options.rooms);
      const adultCount = parseInt(options.adults);
      const childCount = parseInt(options.children);

      const occupancyDetails = [];
      for (let i = 1; i <= numOfRooms; i++) {
        const detail: any = {
          roomNum: i,
          adultCount,
          childCount,
        };
        if (options.childAge) {
          detail.childAgeDetails = options.childAge.split(',').map(Number);
        }
        occupancyDetails.push(detail);
      }

      const result = await hotelPriceConfirm({
        hotelID: parseInt(options.hotelId),
        ratePlanID: options.ratePlanId,
        numOfRooms,
        dateParam: {
          checkInDate: options.checkInDate,
          checkOutDate: options.checkOutDate,
        },
        occupancyDetails,
        localeParam: {
          nationality: options.nationality,
          currency: options.currency,
        },
      });
      console.log(JSON.stringify(result, null, 2));
    } catch (error: any) {
      console.error('Price confirmation failed:', error.message);
      process.exit(1);
    }
  });

// 5. Create booking
program
  .command('book')
  .description('Create hotel booking')
  .requiredOption('--reference-no <no>', 'Booking reference number')
  .requiredOption('--first-name <name>', 'Contact first name')
  .requiredOption('--last-name <name>', 'Contact last name')
  .option('--guests <json>', 'Guest info JSON')
  .option('--customer-request <request>', 'Special customer requests')
  .action(async (options) => {
    try {

      let guestList;
      if (options.guests) {
        guestList = JSON.parse(options.guests);
      } else {
        // Default: Contact as the only guest
        guestList = [
          {
            roomNum: 1,
            guestInfo: [
              {
                firstName: options.firstName,
                lastName: options.lastName,
                isAdult: true,
              },
            ],
          },
        ];
      }

      const bookingParams: any = {
        referenceNo: options.referenceNo,
        contact: {
          firstName: options.firstName,
          lastName: options.lastName,
        },
        guestList,
      };

      if (options.customerRequest) {
        bookingParams.customerRequest = options.customerRequest;
      }

      const result = await createHotelBooking(bookingParams);
      console.log(JSON.stringify(result, null, 2));
    } catch (error: any) {
      console.error('Booking failed:', error.message);
      process.exit(1);
    }
  });

// 6. Search orders
program
  .command('orders')
  .description('Search orders list')
  .action(async () => {
    try {
      const result = await searchHotelOrders();
      console.log(JSON.stringify(result, null, 2));
    } catch (error: any) {
      console.error('Failed to query orders:', error.message);
      process.exit(1);
    }
  });

// 7. Update CLI
program
  .command('update')
  .description('Update CLI to latest version')
  .action(() => {
    try {
      console.log('Updating @rollinggo/hotel-global to latest version...');
      execSync('npm install -g @rollinggo/hotel-global@latest', { stdio: 'inherit' });
      console.log('Updated successfully!');
    } catch (error: any) {
      console.error('Update failed:', error.message);
      process.exit(1);
    }
  });

program.parse();
