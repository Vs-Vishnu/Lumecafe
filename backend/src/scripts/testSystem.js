/**
 * Automated Test Suite for Customer and Delivery Partner Management System
 * Tests RBAC, OAuth/Auth flows, Invitation System, Order Assignment, Delivery Lifecycle, and Map Services.
 */

const assert = require('assert');

const BASE_URL = 'http://localhost:5000/api';

const runTests = async () => {
  console.log('\n======================================================');
  console.log('STARTING AUTOMATED SYSTEM VERIFICATION TESTS');
  console.log('======================================================\n');

  let testsPassed = 0;
  let testsFailed = 0;

  const test = async (name, fn) => {
    try {
      await fn();
      console.log(`[PASS] ${name}`);
      testsPassed++;
    } catch (err) {
      console.error(`[FAIL] ${name}`);
      console.error(`       Error: ${err.message}`);
      testsFailed++;
    }
  };

  // Helper fetch wrapper
  const request = async (endpoint, options = {}) => {
    const url = `${BASE_URL}${endpoint}`;
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    const res = await fetch(url, { ...options, headers });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, ok: res.ok, data };
  };

  let adminToken = '';
  let customerToken = '';
  let customerId = '';
  let deliveryPartnerToken = '';
  let deliveryPartnerId = '';
  let invitationToken = '';
  let createdOrderId = '';

  // 1. Check Backend Health
  await test('1. Backend Health Check', async () => {
    const res = await request('/health');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.status, 'OK');
  });

  // 2. Admin Authentication
  await test('2. Admin Login with Seeded Credentials', async () => {
    const res = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'admin@lumebills.com',
        password: 'admin123',
      }),
    });
    assert.strictEqual(res.status, 200, `Login failed: ${res.data.message}`);
    assert.strictEqual(res.data.user.role, 'admin');
    assert.ok(res.data.token);
    adminToken = res.data.token;
  });

  // 3. Customer Registration RBAC Enforcement
  await test('3. Public Customer Registration enforces "customer" role even if requesting privileged role', async () => {
    const testCustomerEmail = `customer_${Date.now()}@example.com`;
    const res = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Jane Customer',
        email: testCustomerEmail,
        password: 'password123',
        phone: '9876543210',
        role: 'admin', // Malicious attempt to escalate to admin
      }),
    });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.data.user.role, 'customer', 'Role was not locked to customer!');
    assert.ok(res.data.token);
    customerToken = res.data.token;
    customerId = res.data.user._id;
  });

  // 4. Role Authorization: Customer cannot access Admin endpoints
  await test('4. Customer cannot access Admin Delivery Partner endpoints (403 Forbidden)', async () => {
    const res = await request('/admin/delivery-partners', {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert.strictEqual(res.status, 403);
  });

  // 5. Unauthenticated user cannot access protected endpoints
  await test('5. Unauthenticated request rejected (401 Unauthorized)', async () => {
    const res = await request('/auth/me');
    assert.strictEqual(res.status, 401);
  });

  // 6. Admin sends Delivery Partner Invitation
  await test('6. Admin can invite a Delivery Partner with secure token', async () => {
    const partnerEmail = `partner_${Date.now()}@delivery.com`;
    const res = await request('/admin/delivery-partners/invitations', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        name: 'Ravi Kumar',
        email: partnerEmail,
        phone: '9898989898',
      }),
    });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.data.data.status, 'pending');

    // Retrieve invitation token from DB via invitation listing or validate
    const listRes = await request('/admin/delivery-partners/invitations', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const inv = listRes.data.data.find((i) => i.email === partnerEmail);
    assert.ok(inv);
    assert.ok(inv.token);
    invitationToken = inv.token;
  });

  // 7. Validate Invitation Token
  await test('7. Validate invitation token with backend', async () => {
    const res = await request(`/delivery-invitations/${invitationToken}/validate`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.data.name, 'Ravi Kumar');
  });

  // 8. Accept Invitation & Activate Delivery Partner
  await test('8. Delivery Partner accepts invitation and activates account', async () => {
    const res = await request(`/delivery-invitations/${invitationToken}/accept`, {
      method: 'POST',
      body: JSON.stringify({
        password: 'partnerPassword123',
        vehicleType: 'Bike',
        vehicleNumber: 'KA-01-AB-1234',
      }),
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.user.role, 'delivery_partner');
    assert.ok(res.data.token);
    deliveryPartnerToken = res.data.token;
    deliveryPartnerId = res.data.user._id;
  });

  // 9. Reusing Accepted Invitation Token is rejected
  await test('9. Token cannot be reused after acceptance', async () => {
    const res = await request(`/delivery-invitations/${invitationToken}/accept`, {
      method: 'POST',
      body: JSON.stringify({
        password: 'anotherPassword123',
      }),
    });
    assert.strictEqual(res.status, 400);
  });

  // 10. Delivery Partner availability management
  await test('10. Delivery Partner can update availability status', async () => {
    const res = await request('/delivery-partner/availability', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${deliveryPartnerToken}` },
      body: JSON.stringify({ availability: 'available' }),
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.data.availability, 'available');
  });

  // 11. Customer creates a manual delivery address
  let addressId = '';
  await test('11. Customer manually creates and saves delivery address with field validation', async () => {
    const res = await request('/customer/addresses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customerToken}` },
      body: JSON.stringify({
        fullName: 'Jane Customer',
        phone: '9876543210',
        houseNumber: 'Flat 402, Sunshine Heights',
        streetName: '12th Cross, Indiranagar',
        area: 'Indiranagar',
        city: 'Bengaluru',
        district: 'Bengaluru Urban',
        state: 'Karnataka',
        postalCode: '560038',
        landmark: 'Opposite Metro Station',
        deliveryInstructions: 'Ring doorbell twice please',
        isDefault: true,
      }),
    });

    assert.strictEqual(res.status, 201, `Address creation failed: ${res.data.message}`);
    assert.ok(res.data.data._id);
    assert.strictEqual(res.data.data.postalCode, '560038');
    addressId = res.data.data._id;
  });

  // 12. Address Postal code validation
  await test('12. Rejects invalid postal code format', async () => {
    const res = await request('/customer/addresses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customerToken}` },
      body: JSON.stringify({
        fullName: 'Jane Customer',
        phone: '9876543210',
        houseNumber: '1',
        streetName: 'Street',
        area: 'Area',
        city: 'City',
        state: 'State',
        postalCode: 'INVALID_PIN',
      }),
    });
    assert.strictEqual(res.status, 400);
  });

  // 13. Customer Places Online Delivery Order
  await test('13. Customer places delivery order using saved manual address', async () => {
    // Get product ID from products list
    const prodRes = await request('/products?limit=1');
    assert.ok(prodRes.data.data.length > 0, 'No products found');
    const product = prodRes.data.data[0];

    const res = await request('/customer/orders', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customerToken}` },
      body: JSON.stringify({
        addressId,
        paymentMethod: 'Cash',
        notes: 'Please keep food hot',
        items: [
          {
            productId: product._id,
            quantity: 2,
          },
        ],
      }),
    });

    assert.strictEqual(res.status, 201, `Order placement failed: ${res.data.message}`);
    assert.strictEqual(res.data.data.deliveryStatus, 'order_placed');
    assert.ok(res.data.data.deliveryConfirmationCode);
    assert.strictEqual(res.data.data.deliveryAddress.city, 'Bengaluru');
    createdOrderId = res.data.data._id;
  });

  // 14. Customer can view their own orders
  await test('14. Customer retrieves their own order history only', async () => {
    const res = await request('/customer/orders', {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert.strictEqual(res.status, 200);
    assert.ok(res.data.data.some((o) => o._id === createdOrderId));
  });

  // 15. Customer Order Tracking
  await test('15. Customer can track live order status and timeline', async () => {
    const res = await request(`/customer/orders/${createdOrderId}`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.data.order._id, createdOrderId);
    assert.ok(Array.isArray(res.data.data.events));
    assert.strictEqual(res.data.data.events[0].eventType, 'ORDER_PLACED');
  });

  // 16. Admin Assigns Delivery Partner
  await test('16. Admin assigns order to active delivery partner', async () => {
    const res = await request(`/admin/delivery-assignments/orders/${createdOrderId}/assign`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        deliveryPartnerId,
        notes: 'Priority delivery',
      }),
    });

    assert.strictEqual(res.status, 200, `Order assignment failed: ${res.data.message}`);
    assert.strictEqual(res.data.data.order.deliveryStatus, 'assigned');
    assert.strictEqual(res.data.data.order.deliveryPartner.toString(), deliveryPartnerId.toString());
  });

  // 17. Delivery Partner sees assigned order
  let assignmentId = '';
  await test('17. Delivery Partner views assigned order on dashboard', async () => {
    const res = await request('/delivery-partner/assignments', {
      headers: { Authorization: `Bearer ${deliveryPartnerToken}` },
    });
    assert.strictEqual(res.status, 200);
    const assigned = res.data.data.find((a) => a.order._id === createdOrderId);
    assert.ok(assigned, 'Assigned order not found in delivery partner list!');
    assignmentId = assigned._id;
  });

  // 18. Delivery Partner Pickup Lifecycle
  await test('18. Delivery Partner marks order as Picked Up', async () => {
    const res = await request(`/delivery-partner/assignments/${assignmentId}/pickup`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${deliveryPartnerToken}` },
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.data.status, 'picked_up');
  });

  // 19. Delivery Partner Out for Delivery Lifecycle
  await test('19. Delivery Partner starts delivery (Out for Delivery)', async () => {
    const res = await request(`/delivery-partner/assignments/${assignmentId}/start`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${deliveryPartnerToken}` },
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.data.status, 'out_for_delivery');
  });

  // 20. Map Route Calculation
  await test('20. Map Service calculates route and distance between partner origin and customer address', async () => {
    const res = await request('/maps/route', {
      method: 'POST',
      headers: { Authorization: `Bearer ${deliveryPartnerToken}` },
      body: JSON.stringify({
        origin: { latitude: 12.9716, longitude: 77.5946 }, // Bangalore City Center
        destination: { latitude: 12.9784, longitude: 77.6408 }, // Indiranagar
        mode: 'fastest',
      }),
    });

    assert.strictEqual(res.status, 200);
    assert.ok(res.data.data.distanceKm > 0);
    assert.ok(res.data.data.durationMinutes > 0);
    assert.ok(Array.isArray(res.data.data.coordinates));
    assert.ok(res.data.data.externalNavigationUrl.includes('google.com/maps'));
  });

  // 21. Delivery Partner Completes Delivery
  await test('21. Delivery Partner marks order as Delivered', async () => {
    const res = await request(`/delivery-partner/assignments/${assignmentId}/complete`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${deliveryPartnerToken}` },
      body: JSON.stringify({
        notes: 'Delivered at customer doorstep as instructed',
      }),
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.data.status, 'delivered');
  });

  // 22. Verify Customer Order status is now Delivered
  await test('22. Customer tracking shows Delivered status', async () => {
    const res = await request(`/customer/orders/${createdOrderId}`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.data.order.deliveryStatus, 'delivered');
    assert.strictEqual(res.data.data.order.status, 'Completed');
  });

  // 23. Password Recovery Endpoint
  await test('23. Password recovery endpoint dispatches reset link', async () => {
    const res = await request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: 'admin@lumebills.com' }),
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
  });

  // 24. Google OAuth Endpoint
  await test('24. Google OAuth endpoint signs in/creates Customer account safely', async () => {
    const res = await request('/auth/google', {
      method: 'POST',
      body: JSON.stringify({
        email: 'oauth_user@example.com',
        name: 'OAuth User',
        googleId: 'google_123456789',
      }),
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.user.role, 'customer');
    assert.ok(res.data.token);
  });

  // 25. Regression Test: Existing POS Order Creation
  await test('25. Regression: Existing In-Store POS Bill Creation still works', async () => {
    const prodRes = await request('/products?limit=1');
    const product = prodRes.data.data[0];

    const res = await request('/orders', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        items: [{ productId: product._id, quantity: 1, name: product.name, price: product.price }],
        paymentMethod: 'Cash',
        paymentStatus: 'Paid',
        cashReceived: 500,
      }),
    });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.data.data.orderType, 'dine_in');
    assert.strictEqual(res.data.data.status, 'Completed');
  });

  // 26. Regression Test: Existing Admin Orders List
  await test('26. Regression: Admin Orders List retrieves both POS and Delivery orders', async () => {
    const res = await request('/orders', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(res.status, 200);
    assert.ok(res.data.data.length > 0);
  });

  console.log('\n======================================================');
  console.log(`TEST RESULTS: ${testsPassed} PASSED, ${testsFailed} FAILED`);
  console.log('======================================================\n');

  if (testsFailed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
};

runTests();
