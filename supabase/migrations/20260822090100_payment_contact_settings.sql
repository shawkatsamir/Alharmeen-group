-- Where customers send money, and how the shop reaches them.
--
-- Seeded empty on purpose: these are the client's real wallet numbers and none
-- of them belong in version control. The admin fills them in from the
-- dashboard, and every surface that renders them hides the row when blank,
-- so an unconfigured shop degrades to "we will contact you" rather than
-- showing an empty field where an account number should be.
--
-- Safe to store in app_settings even though it is world-readable: these are
-- numbers the shop publishes to customers anyway. Nothing secret goes here.

insert into public.app_settings (key, value, description) values
  ('payment_vodafone_cash_number', '""'::jsonb,
   'Vodafone Cash wallet number customers transfer to, e.g. 01XXXXXXXXX.'),
  ('payment_instapay_handle', '""'::jsonb,
   'InstaPay address customers transfer to, e.g. name@instapay.'),
  ('payment_bank_account', '""'::jsonb,
   'Bank account / IBAN shown for the bank transfer method.'),
  ('contact_whatsapp_number', '""'::jsonb,
   'WhatsApp number in international format without +, e.g. 201XXXXXXXXX. '
   'Used to build wa.me deep links on the order pages.')
on conflict (key) do nothing;
