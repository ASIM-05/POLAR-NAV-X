import { type Iceberg } from '../data/mockIceberg';
import { API_BASE_URL } from '../config';

export interface ApiIceberg {
  id: string;
  latitude: number;
  longitude: number;
  length_nm?: number | null;
  width_nm?: number | null;
  last_updated?: string | null;
  source?: string | null;
}

const NM2_TO_KM2 = 1.852 * 1.852; // ~3.4299 km² per nautical mile²

function isValidCoordinate(latitude: number, longitude: number): boolean {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

function estimateRisk(lengthNm?: number | null, widthNm?: number | null): Iceberg['riskLevel'] {
  if (lengthNm == null || widthNm == null) return 'LOW';
  const areaNm2 = lengthNm * widthNm;
  if (areaNm2 > 500) return 'HIGH';
  if (areaNm2 > 100) return 'MEDIUM';
  return 'LOW';
}

export async function fetchIcebergs(): Promise<Iceberg[]> {
  const response = await fetch(`${API_BASE_URL}/icebergs`);
  if (!response.ok) {
    throw new Error(`Failed to fetch icebergs (${response.status})`);
  }

  const data: unknown = await response.json();
  if (!Array.isArray(data)) {
    return [];
  }

  return (data as ApiIceberg[])
    .filter((record) => {
      const latitude = Number(record.latitude);
      const longitude = Number(record.longitude);
      return (
        typeof record.id === 'string' &&
        record.id.trim() !== '' &&
        isValidCoordinate(latitude, longitude)
      );
    })
    .map((record) => {
      const id = record.id.trim().toUpperCase();
      const latitude = Number(record.latitude);
      const longitude = Number(record.longitude);
      const lengthNm = record.length_nm ?? null;
      const widthNm = record.width_nm ?? null;

      let sizeKm2: number | null = null;
      if (lengthNm != null && widthNm != null) {
        sizeKm2 = Number((lengthNm * widthNm * NM2_TO_KM2).toFixed(2));
      }

      return {
        id,
        name: `Iceberg ${id}`,
        latitude,
        longitude,
        lengthNm,
        widthNm,
        sizeKm2,
        riskLevel: estimateRisk(lengthNm, widthNm),
        lastObserved: record.last_updated || 'Recent',
        source: record.source || 'Unknown',
      };
    });
}
