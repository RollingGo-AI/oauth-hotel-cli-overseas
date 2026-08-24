import { loadToken } from './auth.js';
import { getMcpBaseUrl, API_ENDPOINTS } from './constants.js';

// General request function
async function request(
  method: string,
  endpoint: string,
  payload?: unknown
): Promise<unknown> {
  const token = loadToken();
  if (!token?.access_token) {
    throw new Error('Not logged in. Please run "rgg login" first.');
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token.access_token}`,
    Accept: 'application/json',
  };

  if (method.toUpperCase() === 'POST') {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${getMcpBaseUrl()}${endpoint}`, {
    method: method.toUpperCase(),
    headers,
    body: payload ? JSON.stringify(payload) : undefined,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`API Request Failed (${response.status}): ${body}`);
  }

  return response.json();
}

// 1. Get search tags
export async function getHotelSearchTags(): Promise<any> {
  return request('GET', API_ENDPOINTS.HOTEL_TAGS);
}

// 2. Search hotels
export async function searchHotels(params: {
  originQuery: string;
  place: string;
  placeType: string;
  size?: number;
  checkInParam?: {
    checkInDate?: string;
    stayNights?: number;
    adultCount?: number;
  };
  filterOptions?: {
    starRatings?: number[];
    distanceInMeter?: number;
  };
  hotelTags?: {
    requiredTags?: string[];
    preferredBrands?: string[];
    maxPricePerNight?: number;
  };
  localeParam?: {
    currency?: string;
    language?: string;
  };
}): Promise<any> {
  return request('POST', API_ENDPOINTS.HOTEL_SEARCH, params);
}

// 3. GetHotel detail
export async function getHotelDetail(params: {
  hotelId?: number;
  name?: string;
  dateParam?: {
    checkInDate?: string;
    checkOutDate?: string;
  };
  occupancyParam?: {
    roomCount?: number;
    adultCount?: number;
    childCount?: number;
    childAgeDetails?: number[];
  };
  filter?: {
    cancelPolicy?: string;
    mealType?: string;
  };
  localeParam?: {
    currency?: string;
    language?: string;
  };
}): Promise<any> {
  return request('POST', API_ENDPOINTS.HOTEL_DETAIL, params);
}

// 4. Price confirm
export async function hotelPriceConfirm(params: {
  hotelID: number;
  ratePlanID: string;
  numOfRooms: number;
  dateParam: {
    checkInDate: string;
    checkOutDate: string;
  };
  occupancyDetails: Array<{
    roomNum: number;
    adultCount: number;
    childCount?: number;
    childAgeDetails?: number[];
  }>;
  localeParam?: {
    currency?: string;
    language?: string;
  };
}): Promise<any> {
  return request('POST', API_ENDPOINTS.PRICE_CONFIRM, params);
}

// 5. Create booking
export async function createHotelBooking(params: {
  referenceNo: string;
  contact: {
    firstName: string;
    lastName: string;
  };
  guestList: Array<{
    roomNum: number;
    guestInfo: Array<{
      firstName: string;
      lastName: string;
      isAdult: boolean;
      age?: number;
    }>;
  }>;
  customerRequest?: string;
}): Promise<any> {
  return request('POST', API_ENDPOINTS.HOTEL_BOOK, params);
}

// 6. Search orders
export async function searchHotelOrders(params?: {
  status?: string;
  dateRange?: {
    startDate?: string;
    endDate?: string;
  };
}): Promise<any> {
  return request('POST', API_ENDPOINTS.HOTEL_ORDERS, params || {});
}

// 7. Get hotel order detail
export async function getHotelOrderDetail(params: {
  orderNo: string;
}): Promise<any> {
  return request('POST', API_ENDPOINTS.HOTEL_ORDER_DETAIL, params);
}
