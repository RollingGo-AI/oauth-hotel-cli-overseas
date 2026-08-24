#!/usr/bin/env node
import dotenv from 'dotenv';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

// Helper function to search for .env files upwards
function findEnvUpwards(startDir: string): string | null {
  let dir = path.resolve(startDir);
  while (true) {
    const envPath = path.join(dir, '.env');
    if (fs.existsSync(envPath) && fs.statSync(envPath).isFile()) {
      return envPath;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      break;
    }
    dir = parent;
  }
  return null;
}

// 1. Search upwards from the current working directory (CWD)
const cwdEnv = findEnvUpwards(process.cwd());
if (cwdEnv) {
  dotenv.config({ path: cwdEnv });
}

// 2. Search upwards from the CLI script location (supports bundled Skills)
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const scriptEnv = findEnvUpwards(scriptDir);
if (scriptEnv && scriptEnv !== cwdEnv) {
  dotenv.config({ path: scriptEnv });
}

// 3. Load from the global home config directory (~/.hotel-global-cli/.env)
const globalEnvPath = path.join(os.homedir(), '.hotel-global-cli', '.env');
if (fs.existsSync(globalEnvPath)) {
  dotenv.config({ path: globalEnvPath });
}
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
  getHotelOrderDetail,
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
  .option('--size <n>', 'Response size', String(DEFAULTS.SIZE))
  .option('--check-in-date <date>', 'Check-in date YYYY-MM-DD')
  .option('--stay-nights <n>', 'Stay nights', String(DEFAULTS.STAY_NIGHTS))
  .option('--adult-count <n>', 'Adults per room', String(DEFAULTS.ADULT_COUNT))
  .option('--star-ratings <min,max>', 'Star ratings range (e.g. 3,5)')
  .option('--distance-in-meter <m>', 'Distance limit (meters)')
  .option('--required-tag <tag>', 'Required tag (can be used multiple times)')
  .option('--preferred-brand <brand>', 'Preferred brand (can be used multiple times)')
  .option('--max-price-per-night <price>', 'Max price per night')
  .option('--currency <currency>', 'Currency code (USD, EUR, JPY, etc.)', DEFAULTS.CURRENCY)
  .option('--language <language>', 'Language code (zh, ja, en)', DEFAULTS.LANGUAGE)
  .action(async (options) => {
    try {
      const params: any = {
        originQuery: options.originQuery,
        place: options.place,
        placeType: options.placeType,
      };

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

      if (options.currency || options.language) {
        params.localeParam = {};
        if (options.currency) params.localeParam.currency = options.currency;
        if (options.language) params.localeParam.language = options.language;
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
  .option('--currency <currency>', 'Currency', DEFAULTS.CURRENCY)
  .option('--language <language>', 'Language code (zh, ja, en)', DEFAULTS.LANGUAGE)
  .option('--cancel-policy <policy>', 'Cancellation policy: CANCELABLE / NON_CANCELABLE')
  .option('--meal-type <type>', 'Meal type: WITH_BREAKFAST / SINGLE_BREAKFAST / DOUBLE_BREAKFAST / NO_MEAL')
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

      if (options.cancelPolicy || options.mealType) {
        params.filter = {};
        if (options.cancelPolicy) params.filter.cancelPolicy = options.cancelPolicy;
        if (options.mealType) params.filter.mealType = options.mealType;
      }

      if (options.currency || options.language) {
        params.localeParam = {};
        if (options.currency) params.localeParam.currency = options.currency;
        if (options.language) params.localeParam.language = options.language;
      }

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
  .option('--currency <currency>', 'Currency', DEFAULTS.CURRENCY)
  .option('--language <language>', 'Language code (zh, ja, en)', DEFAULTS.LANGUAGE)
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

      const localeParam: any = {};
      if (options.currency) localeParam.currency = options.currency;
      if (options.language) localeParam.language = options.language;

      const result = await hotelPriceConfirm({
        hotelID: parseInt(options.hotelId),
        ratePlanID: options.ratePlanId,
        numOfRooms,
        dateParam: {
          checkInDate: options.checkInDate,
          checkOutDate: options.checkOutDate,
        },
        occupancyDetails,
        localeParam: Object.keys(localeParam).length > 0 ? localeParam : undefined,
      });
      console.log(JSON.stringify(result, null, 2));
    } catch (error: any) {
      console.error('Price confirmation failed:', error.message);
      process.exit(1);
    }
  });

function parseGuestList(value: string, previous: any[]) {
  const parts = value.split(',');
  const roomNum = parseInt(parts[0], 10) || 1;
  const firstName = parts[1] || '';
  const lastName = parts[2] || '';
  const isAdult = parts[3] ? parts[3].toLowerCase() !== 'false' : true;
  
  let room = previous.find((r: any) => r.roomNum === roomNum);
  if (!room) {
    room = { roomNum, guestInfo: [] };
    previous.push(room);
  }
  room.guestInfo.push({ firstName, lastName, isAdult });
  return previous;
}

// 5. Create booking
program
  .command('book')
  .description('Create hotel booking')
  .requiredOption('--reference-no <no>', 'Booking reference number')
  .option('--first-name <name>', 'Contact first name (optional, defaults to first guest)')
  .option('--last-name <name>', 'Contact last name (optional, defaults to first guest)')
  .option('--guest <info>', 'Guest info: roomNum,firstName,lastName,isAdult (e.g. 1,San,Zhang,true)', parseGuestList, [])
  .option('--customer-request <request>', 'Special customer requests')
  .action(async (options) => {
    try {

      let guestList = options.guest;
      let contactFirstName = options.firstName;
      let contactLastName = options.lastName;

      if (!contactFirstName && (!guestList || guestList.length === 0)) {
        console.error('Booking failed: Must provide --first-name/--last-name or at least one --guest');
        process.exit(1);
      }

      if (guestList && guestList.length > 0) {
        if (!contactFirstName) contactFirstName = guestList[0].guestInfo[0].firstName;
        if (!contactLastName) contactLastName = guestList[0].guestInfo[0].lastName;
      } else {
        // Default: Contact as the only guest
        guestList = [
          {
            roomNum: 1,
            guestInfo: [
              {
                firstName: contactFirstName,
                lastName: contactLastName,
                isAdult: true,
              },
            ],
          },
        ];
      }

      const bookingParams: any = {
        referenceNo: options.referenceNo,
        contact: {
          firstName: contactFirstName,
          lastName: contactLastName,
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
  .option('-s, --status <status>', 'Order status filter (ALL, PENDING, FINISHED)')
  .option('--start-date <date>', 'Start date (YYYY-MM-DD)')
  .option('--end-date <date>', 'End date (YYYY-MM-DD)')
  .action(async (options) => {
    try {
      const params: any = {};
      if (options.status) params.status = options.status;
      if (options.startDate || options.endDate) {
        params.dateRange = {};
        if (options.startDate) params.dateRange.startDate = options.startDate;
        if (options.endDate) params.dateRange.endDate = options.endDate;
      }
      
      const result = await searchHotelOrders(Object.keys(params).length > 0 ? params : undefined);
      console.log(JSON.stringify(result, null, 2));
    } catch (error: any) {
      console.error('Failed to query orders:', error.message);
      process.exit(1);
    }
  });

// 7. Get order detail
program
  .command('order-detail <orderNo>')
  .description('Get hotel order detail')
  .action(async (orderNo) => {
    try {
      const result = await getHotelOrderDetail({ orderNo });
      console.log(JSON.stringify(result, null, 2));
    } catch (error: any) {
      console.error('Failed to query order detail:', error.message);
      process.exit(1);
    }
  });

// 8. Initialize configuration
program
  .command('init')
  .description('Initialize configuration (Auto-generate and merge global .env file in home directory for MCP and OAuth server URLs)')
  .option('--mcp-base-url <url>', 'MCP Base URL')
  .option('--oauth-server-url <url>', 'OAuth Server URL')
  .option('--oauth-authorize-url <url>', 'OAuth Authorize URL')
  .option('--client-id <id>', 'Client ID')
  .action((options) => {
    try {
      const configDir = path.join(os.homedir(), '.hotel-global-cli');
      const envPath = path.join(configDir, '.env');
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      
      let existingEnv: Record<string, string> = {};
      if (fs.existsSync(envPath)) {
         existingEnv = dotenv.parse(fs.readFileSync(envPath, 'utf8'));
      }
      
      const newEnv = {
        ...existingEnv,
        ...(options.mcpBaseUrl && { MCP_BASE_URL: options.mcpBaseUrl }),
        ...(options.oauthServerUrl && { OAUTH_SERVER_URL: options.oauthServerUrl }),
        ...(options.oauthAuthorizeUrl && { OAUTH_AUTHORIZE_URL: options.oauthAuthorizeUrl }),
        ...(options.clientId && { CLIENT_ID: options.clientId }),
      };

      const envContent = Object.entries(newEnv)
        .map(([k, v]) => `${k}=${v}`)
        .join('\n') + '\n';
        
      fs.writeFileSync(envPath, envContent, 'utf8');
      console.log(`Configuration saved to: ${envPath}`);
    } catch (error: any) {
      console.error('Initialization failed:', error.message);
      process.exit(1);
    }
  });

// 9. Update CLI
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
