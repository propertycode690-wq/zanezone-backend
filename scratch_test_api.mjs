async function test() {
  try {
    const loginRes = await fetch('https://zanezion-backend-production-6c8a.up.railway.app/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'superadmin@zanezion.com', password: 'admin@123' })
    });
    const loginData = await loginRes.json();
    console.log('Login success:', loginData.success);
    const token = loginData.data?.token;
    if (!token) {
      console.error('No token, login response:', loginData);
      return;
    }

    const headers = { Authorization: `Bearer ${token}` };

    const itemsRes = await fetch('https://zanezion-backend-production-6c8a.up.railway.app/api/v1/items?limit=50', { headers });
    const itemsData = await itemsRes.json();
    console.log('Items status:', itemsRes.status, 'Total items:', itemsData.data?.meta?.totalItems || itemsData.data?.items?.length || itemsData.data?.length);

    const catsRes = await fetch('https://zanezion-backend-production-6c8a.up.railway.app/api/v1/item-categories', { headers });
    const catsData = await catsRes.json();
    console.log('Categories:', catsData.data?.categories || catsData.data);

    const unitsRes = await fetch('https://zanezion-backend-production-6c8a.up.railway.app/api/v1/item-units', { headers });
    const unitsData = await unitsRes.json();
    console.log('Units:', unitsData.data?.units || unitsData.data);

    const whRes = await fetch('https://zanezion-backend-production-6c8a.up.railway.app/api/v1/warehouses', { headers });
    const whData = await whRes.json();
    console.log('Warehouses:', whData.data?.warehouses || whData.data);

    // Now test creating a single test item
    const testItem = {
      name: 'Test Bananas Organic',
      categoryId: 16, // Grocery
      unitId: 8,     // Pieces
      description: 'Test bananas description',
      price: 2.49,
      qty: 150,
      warehouseId: 24, // Nassau Warehouse
      inventoryType: 'MARKETPLACE'
    };
    const createRes = await fetch('https://zanezion-backend-production-6c8a.up.railway.app/api/v1/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(testItem)
    });
    const createData = await createRes.json();
    console.log('Create item status:', createRes.status, createData);

  } catch (e) {
    console.error('Error during test:', e);
  }
}
test();
