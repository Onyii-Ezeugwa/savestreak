export type SchoolKind = "k12" | "college";

export interface SchoolOption {
  id: string;
  name: string;
  city: string;
  state: string;
  kind: SchoolKind;
}
