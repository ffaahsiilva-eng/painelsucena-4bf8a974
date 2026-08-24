declare module "@supabase/supabase-js" {
  export type Session = any;
  export type User = any;
  export type RealtimeChannel = any;
  export type PostgrestError = any;

  export interface SupabaseAuthClient {
    onAuthStateChange: (...args: any[]) => any;
    getSession: (...args: any[]) => Promise<any>;
    refreshSession: (...args: any[]) => Promise<any>;
    signOut: (...args: any[]) => Promise<any>;
    getUser: (...args: any[]) => Promise<any>;
    signInWithPassword: (...args: any[]) => Promise<any>;
    signUp: (...args: any[]) => Promise<any>;
    updateUser: (...args: any[]) => Promise<any>;
  }

  export interface SupabaseClient<Database = any> {
    auth: SupabaseAuthClient;
    from: (...args: any[]) => any;
    channel: (...args: any[]) => any;
    removeChannel: (...args: any[]) => any;
    removeAllChannels: (...args: any[]) => any;
    rpc: (...args: any[]) => any;
    storage: any;
    functions: any;
  }

  export function createClient<Database = any>(
    supabaseUrl: string,
    supabaseKey: string,
    options?: any,
  ): SupabaseClient<Database>;
}
