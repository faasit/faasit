import fs from 'fs';
import path from 'path';
import { ConfigEntry } from './types';

const CONFIG_FILE = 'LoadConfig.txt';

export function parseConfig(): ConfigEntry[] {
    // Read the config file
    const configPath = path.join(__dirname, CONFIG_FILE);
    const content = fs.readFileSync(configPath, 'utf-8');

    return content
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#')) // Ignore empty lines and comments
        .map(line => {
            // Split the line by whitespace and remove empty parts
            const parts = line.split(/\s+/).filter(Boolean);

            // Ensure the line has at least 4 parts
            if (parts.length < 4) {
                throw new Error(`Invalid config line: ${line}`);
            }

            // Parse the config entry
            const entry : ConfigEntry = {
                time: parseNumber(parts[0], 'time'),
                model: parts[1],
                mode: parseMode(parts[2]),
                primaryParam: parseNumber(parts[3], 'primaryParam'),
                params: parts.slice(4).map(str => parseNumber(str, 'params'))
            };

            // Validate the config entry
            if (entry.mode === 0 && entry.primaryParam <= 0) {
                throw new Error("Duration must be greater than 0.");
            }
            if (entry.mode === 1 && entry.primaryParam <= 0) {
                throw new Error("Count must be greater than 0.");
            }

            return entry;
        });
}

// Helper function to parse a number from a string
function parseNumber(str: string, fieldName: string): number {
    const num = Number(str);
    if (isNaN(num)) {
        throw new Error(`Invalid number for field ${fieldName}: ${str}`);
    }
    return num;
}

// Helper function to parse a mode from a string
function parseMode(str: string): 0 | 1 {
    const mode = Number(str);
    if (mode !== 0 && mode !== 1) {
        throw new Error(`Invalid mode: ${str}`);
    }
    return mode as 0 | 1;
}