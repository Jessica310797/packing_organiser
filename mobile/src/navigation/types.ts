export type TripDetailParams = { tripId: string; destination: string };

export type TripsStackParamList = {
  Home: undefined;
  NewTrip: undefined;
  TripDetail: TripDetailParams;
};

export type PackingListDetailParams = { listId: string; name: string };

export type PackStackParamList = {
  PackHome: undefined;
  PackingListDetail: PackingListDetailParams;
};

export type RootTabParamList = {
  TripsTab: undefined;
  WardrobeTab: undefined;
  PackTab: undefined;
  ProfileTab: undefined;
};
