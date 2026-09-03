import { BaseService } from './base.service';
import { normalizeError } from './api-error';

export class AuthService extends BaseService {
  async signIn(email: string, password: string): Promise<void> {
    const { error } = await this.client.auth.signInWithPassword({ email, password });
    if (error) throw normalizeError(error);
  }

  async signUp(email: string, password: string, displayName: string): Promise<void> {
    const { error } = await this.client.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    });
    if (error) throw normalizeError(error);
  }

  async signOut(): Promise<void> {
    const { error } = await this.client.auth.signOut();
    if (error) throw normalizeError(error);
  }

  async resetPassword(email: string): Promise<void> {
    const { error } = await this.client.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    if (error) throw normalizeError(error);
  }

  async updatePassword(password: string): Promise<void> {
    const { error } = await this.client.auth.updateUser({ password });
    if (error) throw normalizeError(error);
  }

  async resendVerification(email: string): Promise<void> {
    const { error } = await this.client.auth.resend({
      type: 'signup',
      email,
    });
    if (error) throw normalizeError(error);
  }

  async signInWithGoogle(): Promise<void> {
    const { error } = await this.client.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) throw normalizeError(error);
  }

  async getSession() {
    const { data, error } = await this.client.auth.getSession();
    if (error) throw normalizeError(error);
    return data.session;
  }
}

export const authService = new AuthService();
