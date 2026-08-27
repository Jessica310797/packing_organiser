export type TripDetailParams = { tripId: string; destination: string };

export type TripsStackParamList = {
  Home: undefined;
  NewTrip: undefined;
  TripDetail: TripDetailParams;
};

export type PackStackParamList = {
  PackHome: undefined;
  TripDetail: TripDetailParams;
};

export type RootTabParamList = {
  TripsTab: undefined;
  WardrobeTab: undefined;
  PackTab: undefined;
  ProfileTab: undefined;
};
