import { config } from '../config';
import { GuildMember } from 'discord.js';

interface CacheEntry<T> {
    data: T;
    expiresAt: number;
}

export class TTLCache<K extends string, V> {
    private cache: Map<K, CacheEntry<V>>;
    private readonly ttl: number;

    constructor(ttlSeconds: number) {
        this.cache = new Map();
        this.ttl = ttlSeconds * 1000; // Convert to milliseconds
    }

    set(key: K, value: V): void {
        this.cache.set(key, {
            data: value,
            expiresAt: Date.now() + this.ttl
        });
    }

    get(key: K): V | null {
        const entry = this.cache.get(key);
        if (!entry) return null;

        // Check if entry has expired
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return null;
        }

        return entry.data;
    }

    delete(key: K): void {
        this.cache.delete(key);
    }

    clear(): void {
        this.cache.clear();
    }

    // Clean up expired entries
    cleanup(): void {
        const now = Date.now();
        for (const [key, entry] of this.cache.entries()) {
            if (now > entry.expiresAt) {
                this.cache.delete(key);
            }
        }
    }
}

// Create a singleton instance for member profiles with TTL from config
export const memberProfileCache = new TTLCache<string, GuildMember>(config.cache.memberProfile.ttl); 