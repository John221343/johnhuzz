import { users, type User, type InsertUser } from "@shared/schema";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Directory management
  directoryExists(directory: string): Promise<boolean>;
  registerDirectory(directory: string, webhook: string): Promise<void>;
  getDirectoryWebhook(directory: string): Promise<string | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private directories: Set<string>;
  private directoryWebhooks: Map<string, string>;
  currentId: number;

  constructor() {
    this.users = new Map();
    this.directories = new Set();
    this.directoryWebhooks = new Map();
    this.currentId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  // Check if a directory already exists
  async directoryExists(directory: string): Promise<boolean> {
    return this.directories.has(directory);
  }
  
  // Register a new directory with its webhook
  async registerDirectory(directory: string, webhook: string): Promise<void> {
    this.directories.add(directory);
    this.directoryWebhooks.set(directory, webhook);
  }
  
  // Get the webhook URL for a specific directory
  async getDirectoryWebhook(directory: string): Promise<string | undefined> {
    return this.directoryWebhooks.get(directory);
  }
}

export const storage = new MemStorage();
