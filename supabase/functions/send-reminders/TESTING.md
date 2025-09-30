# Manual testing for `send-reminders`

These checks cover both successful deliveries and provider failures. Run them from the Supabase Dashboard or with `supabase functions invoke send-reminders --env-file supabase/.env`. Replace IDs and endpoints with real values.

## 1. Successful email delivery
1. Configure `REMINDER_EMAIL_WEBHOOK_URL` to point to a test endpoint that returns HTTP 200.
2. Ensure the `reminders` row has at least one channel:
   ```sql
   update reminders
   set channels = jsonb_build_array(jsonb_build_object('type', 'email', 'target', 'test@example.com'))
   where id = '<REMINDER_ID>';
   ```
3. Invoke the function:
   ```bash
   supabase functions invoke send-reminders --body '{"reminderId":"<REMINDER_ID>"}'
   ```
4. Confirm:
   - The provider endpoint received the payload.
   - `reminder_notifications` has a new row with `status = 'sent'`.
   - `reminders.triggered_at` is updated.

## 2. Provider failure path
1. Reconfigure the channel to simulate a failure:
   ```sql
   update reminders
   set channels = jsonb_build_array(jsonb_build_object('type', 'email', 'target', 'test@example.com', 'simulateFailure', true))
   where id = '<REMINDER_ID>';
   ```
2. Invoke the function as above.
3. Confirm:
   - The function response reports `success: false` for the attempt.
   - `reminder_notifications.status` is `failed` with the error message.
   - `reminders.triggered_at` is updated even though the provider failed (delivery was attempted).
