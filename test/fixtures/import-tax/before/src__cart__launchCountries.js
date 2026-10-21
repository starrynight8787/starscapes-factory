// The countries a customer can have a print delivered to, free. This one list is used by the checkout (to limit the
// delivery address) and by the cart page (to say where delivery is free).
//
// To add a country: first check what Creative Hub charges to send a print there (Connections and delivery costs on the
// publish page). Only add it if you still keep a healthy margin with free delivery. The far countries (Australia, New
// Zealand, Japan, Singapore, the UAE, South Africa, Brazil and so on) leave only about 9 to 10 percent, so they are not here.
//
// Checked so far: the UK, Ireland, Germany, France, the US and Canada. The rest of Europe is waiting for its check.
export const LAUNCH_COUNTRIES = ['GB', 'IE', 'DE', 'FR', 'US', 'CA']
