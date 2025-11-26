export type SecurityRuleContext = {
  path: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  requestResourceData?: any;
};

export class FirestorePermissionError extends Error {
  public readonly context: SecurityRuleContext;
  constructor(context: SecurityRuleContext) {
    const deniedMessage = `The following request was denied by Firestore Security Rules:\n${JSON.stringify(context, null, 2)}`;
    super(`FirestoreError: Missing or insufficient permissions: ${deniedMessage}`);
    this.name = 'FirestorePermissionError';
    this.context = context;

    // This is necessary for custom errors to work correctly in TypeScript.
    Object.setPrototypeOf(this, FirestorePermissionError.prototype);
  }
}
