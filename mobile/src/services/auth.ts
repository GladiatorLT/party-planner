const USER_POOL_ID = process.env.EXPO_PUBLIC_USER_POOL_ID!;
const CLIENT_ID = process.env.EXPO_PUBLIC_USER_POOL_CLIENT_ID!;
const COGNITO_URL = `https://cognito-idp.us-east-1.amazonaws.com/`;

const cognitoFetch = async (target: string, body: object) => {
  const res = await fetch(COGNITO_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-amz-json-1.1',
      'X-Amz-Target': `AWSCognitoIdentityProviderService.${target}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (data.__type) throw new Error(data.message || data.__type);
  return data;
};

export const auth = {
  signIn: async (username: string, password: string) => {
    const data = await cognitoFetch('InitiateAuth', {
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: CLIENT_ID,
      AuthParameters: { USERNAME: username, PASSWORD: password },
    });
    return {
      accessToken: data.AuthenticationResult.AccessToken,
      idToken: data.AuthenticationResult.IdToken,
      refreshToken: data.AuthenticationResult.RefreshToken,
    };
  },

  signUp: async (username: string, password: string, email: string) => {
    await cognitoFetch('SignUp', {
      ClientId: CLIENT_ID,
      Username: username,
      Password: password,
      UserAttributes: [{ Name: 'email', Value: email }],
    });
  },

  confirmSignUp: async (username: string, code: string) => {
    await cognitoFetch('ConfirmSignUp', {
      ClientId: CLIENT_ID,
      Username: username,
      ConfirmationCode: code,
    });
  },

  forgotPassword: async (username: string) => {
    await cognitoFetch('ForgotPassword', {
      ClientId: CLIENT_ID,
      Username: username,
    });
  },

  confirmForgotPassword: async (username: string, code: string, newPassword: string) => {
    await cognitoFetch('ConfirmForgotPassword', {
      ClientId: CLIENT_ID,
      Username: username,
      ConfirmationCode: code,
      Password: newPassword,
    });
  },

  changePassword: async (accessToken: string, oldPassword: string, newPassword: string) => {
    await cognitoFetch('ChangePassword', {
      AccessToken: accessToken,
      PreviousPassword: oldPassword,
      ProposedPassword: newPassword,
    });
  },
};
