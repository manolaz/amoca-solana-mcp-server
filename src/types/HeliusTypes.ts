// Type definitions for Helius API responses
export interface HeliusAsset {
  id: string;
  content: {
    metadata: any;
    files?: any[];
    json_uri?: string;
    links?: any;
  };
  authorities: any[];
  compression: any;
  grouping: any[];
  royalty: any;
  creators: any[];
  ownership: any;
  supply: any;
  mutable: boolean;
  burnt: boolean;
}

export interface HeliusAssetsByOwnerResponse {
  items: HeliusAsset[];
  total: number;
  limit: number;
  page: number;
}
