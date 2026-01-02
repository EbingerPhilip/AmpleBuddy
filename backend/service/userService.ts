import { userRepository } from "../repository/userRepository";

type CreateUserInput = {
  username: string;
  password: string;
  nicknames: string;
  dailyMood?: string;          // expects 'green' | 'orange' | 'red' | 'gray'
  dateOfBirth?: Date | null;
  theme?: string;              // 'light' | 'dark' | 'moody'
  pronouns?: string;           // 'he/him' | 'she/her' | 'they/them' | 'hidden'
  instantBuddy?: boolean;
};

type UpdateUserInput = Partial<CreateUserInput>;

class UserService {
  async createUser(input: CreateUserInput): Promise<number> {
    return userRepository.createUser(input);
  }

  async getUserById(userId: number): Promise<any | null> {
    return userRepository.getUserById(userId);
  }

  // optional helper to fetch all users if needed later
  // async getAllUsers(): Promise<any[]> {
  //   return userRepository.getAllUsers();
  // }

  async updateUser(userId: number, updates: UpdateUserInput): Promise<void> {
    const existing = await userRepository.getUserById(userId);
    if (!existing) throw new Error("User not found");
    await userRepository.updateUser(userId, updates);
  }
}

export const userService = new UserService();