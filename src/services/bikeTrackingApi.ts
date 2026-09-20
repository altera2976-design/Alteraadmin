import api from "./api";

const extractErrorMessage = (error: any) => {
  if (error?.status === 401 || error?.response?.status === 401) {
    return "Your session has expired. Please login again.";
  }
  if (error?.status === 404 || error?.response?.status === 404) {
    return "Bike tracking service is unavailable. Please contact the administrator.";
  }
  if (
    error?.code === "ECONNABORTED" ||
    error?.message?.toLowerCase()?.includes("network error") ||
    error?.message?.toLowerCase()?.includes("network")
  ) {
    return "Unable to connect to server. Please check your internet connection.";
  }
  if (typeof error === "string") return error;
  if (error?.response?.data?.message) return error.response.data.message;
  if (error?.message) return error.message;
  if (error?.data?.message) return error.data.message;
  return "Unable to complete bike tracking request. Please check your network and try again.";
};

export const bikeTrackingApi = {
  startSession: async (data: {
    bikeNumber: string;
    startingMeterReading: number;
    date?: string;
    startTime?: string;
    startLocation?: any;
  }) => {
    try {
      const response = await api.post("/bike-tracking/start", data);
      return response.data;
    } catch (error: any) {
      throw new Error(extractErrorMessage(error));
    }
  },

  recordLocationPing: async (data: {
    sessionId?: string;
    latitude: number;
    longitude: number;
    accuracy?: number;
    speed?: number;
    currentMeterReading?: number;
    distanceKm?: number;
  }) => {
    try {
      const response = await api.post("/bike-tracking/location", data);
      return response.data;
    } catch (error: any) {
      console.warn("Location ping warning:", extractErrorMessage(error));
      return null;
    }
  },

  stopSession: async (
    id: string,
    data: {
      endingMeterReading?: number;
      totalDistance?: number;
      distanceKm?: number;
      notes?: string;
      stopLocation?: any;
      locationHistory?: any[];
    }
  ) => {
    try {
      try {
        const response = await api.patch(`/bike-tracking/${id}/stop`, data);
        return response.data;
      } catch (firstErr: any) {
        if (firstErr?.response?.status === 401) {
          throw new Error("Your session has expired. Please login again.");
        }
        const response = await api.post("/bike-tracking/stop", {
          ...data,
          id,
          sessionId: id,
        });
        return response.data;
      }
    } catch (error: any) {
      throw new Error(extractErrorMessage(error));
    }
  },

  getActiveSession: async () => {
    try {
      const response = await api.get("/bike-tracking/active");
      return response.data;
    } catch (error: any) {
      throw new Error(extractErrorMessage(error));
    }
  },

  getHistory: async () => {
    try {
      const response = await api.get("/bike-tracking/history");
      return response.data;
    } catch (error: any) {
      throw new Error(extractErrorMessage(error));
    }
  },

  getMonthlySummary: async (month?: string) => {
    try {
      const query = month ? `?month=${month}` : "";
      const response = await api.get(`/bike-tracking/monthly${query}`);
      return response.data;
    } catch (error: any) {
      throw new Error(extractErrorMessage(error));
    }
  },

  getLatestForBike: async (bikeNumber: string) => {
    try {
      const response = await api.get(`/bike-tracking/latest/${bikeNumber}`);
      return response.data;
    } catch (error: any) {
      throw new Error(extractErrorMessage(error));
    }
  },

  calculateDistance: async (coords: { lat1: number; lon1: number; lat2: number; lon2: number }) => {
    try {
      const response = await api.post("/bike-tracking/calculate-distance", coords);
      return response.data;
    } catch (error: any) {
      throw new Error(extractErrorMessage(error));
    }
  },
};



