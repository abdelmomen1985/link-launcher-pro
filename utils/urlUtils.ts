import { ParsedUrl } from '../types';
import LZString from 'lz-string';

// Regex to extract URLs from text. Catches http, https, and www.
const URL_REGEX = /((https?:\/\/)|(www\.))[^\s/$.?#].[^\s]*/gi;

export const extractUrls = (text: string): ParsedUrl[] => {
  const matches = text.match(URL_REGEX) || [];
  
  return matches.map((url, index) => {
    let cleanUrl = url;
    let protocol = 'https';
    
    // Normalize URL
    if (url.startsWith('www.')) {
      cleanUrl = `https://${url}`;
    } else if (url.startsWith('http://')) {
      protocol = 'http';
    }

    // Basic validation check
    let valid = true;
    try {
      new URL(cleanUrl);
    } catch (e) {
      valid = false;
    }

    // Use a deterministic ID based on content and index to help with rendering stability
    const id = `url-${index}-${cleanUrl.length}`; 

    return {
      id,
      original: cleanUrl,
      valid,
      protocol
    };
  });
};

export const removeDuplicates = (urls: ParsedUrl[]): string => {
  const unique = new Set<string>();
  const result: string[] = [];
  
  urls.forEach(u => {
    if (!unique.has(u.original)) {
      unique.add(u.original);
      result.push(u.original);
    }
  });
  
  return result.join('\n');
};

export const sortUrls = (urls: ParsedUrl[]): string => {
  const sorted = [...urls].sort((a, b) => a.original.localeCompare(b.original));
  return sorted.map(u => u.original).join('\n');
};

// Compress and Encode using LZ-String for URL safety and compactness
export const encodeUrlsForSharing = (urls: ParsedUrl[]): string => {
  try {
    const rawUrls = urls.map(u => u.original);
    const jsonString = JSON.stringify(rawUrls);
    return LZString.compressToEncodedURIComponent(jsonString);
  } catch (e) {
    console.error("Failed to encode URLs", e);
    return '';
  }
};

export const decodeSharedUrls = (hash: string): string[] => {
  if (!hash) return [];

  try {
    // 1. Try decompressing with LZString (New format)
    let jsonString = LZString.decompressFromEncodedURIComponent(hash);

    // 2. Fallback to standard Base64 (Legacy format support)
    // If LZString returns null or empty, it might be an old link
    if (!jsonString) {
      try {
        jsonString = atob(hash);
      } catch (e) {
        // Not valid base64 either
        return [];
      }
    }

    if (!jsonString) return [];

    const parsed = JSON.parse(jsonString);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch (e) {
    console.error("Failed to decode URLs", e);
    return [];
  }
};
