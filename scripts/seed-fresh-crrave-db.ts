import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, writeBatch, collection, getDocs } from 'firebase/firestore';
import { CRRAVE_CATEGORIES, CRRAVE_MENU_ITEMS } from '../src/data/crraveMenuData';
import config from '../firebase-applet-config.json' with { type: 'json' };

async function seedFreshDb() {
  console.log('=== SEEDING FRESH DEDICATED CRRAVE LEYTON FIREBASE DATABASE ===');
  console.log('Project ID:', config.projectId);
  console.log('Database ID:', config.firestoreDatabaseId);

  const app = initializeApp(config);
  const db = getFirestore(app, config.firestoreDatabaseId);

  // Set default admin user profile
  await setDoc(doc(db, 'users', 'crrave_admin_default'), {
    name: 'Crrave Leyton Admin',
    email: 'crraveleyton@gmail.com',
    role: 'admin',
    createdAt: new Date().toISOString()
  });
  console.log('Admin user initialized in users collection');

  const crraveSettings = {
    businessName: 'Crrave Leyton',
    tagline: 'CRRAVE LEYTON - SMASH BURGERS & GRILL',
    headerAddress: '323A Lea Bridge Road, E10 7LA',
    headerPhone: '07947465085 / 01708361952',
    adminPasscodeHash: '619a47f74eaa97d9341968a88be2b7ac4f4451dfdb5824ffd6563d6894a05d52', // SHA-256 of crrave@#2026
    showOnPremiseNumber: true,
    showContactDetails: true,
    showTime: true,
    showItems: true,
    showIsPaid: false,
    showPaymentMethod: true,
    showClientInfo: true,
    showDirection: true,
    showClientComment: true,
    showOrderDetails: true,
    showInfoBox1: false,
    showInfoBox2: false,
    showInfoBox3: false,
    showOrderOnline: false,
    allowCashOrders: true,
    minCollectionOrder: 15,
    minDeliveryOrder: 20,
    freeDeliveryEnabled: false,
    freeDeliveryMinOrder: 50,
    cashDiscount: { enabled: false, minOrder: 20, percentage: 10 },
    collectionDiscount: { enabled: false, minOrder: 15, percentage: 10 },
    deliveryDiscount: { enabled: false, minOrder: 25, percentage: 10 },
    localDeliveryFee: 1.5,
    deliveryFees: [
      { postcode: 'E10', fee: 1.5 },
      { postcode: 'E11', fee: 2.5 },
      { postcode: 'E17', fee: 3.0 },
      { postcode: 'E5', fee: 3.5 }
    ],
    businessHours: {
      monday: { open: '12:00', close: '00:00', closed: false },
      tuesday: { open: '12:00', close: '00:00', closed: false },
      wednesday: { open: '12:00', close: '00:00', closed: false },
      thursday: { open: '12:00', close: '00:00', closed: false },
      friday: { open: '12:00', close: '00:00', closed: false },
      saturday: { open: '12:00', close: '00:00', closed: false },
      sunday: { open: '12:00', close: '00:00', closed: false },
    },
    closedDates: [],
    updatedAt: new Date().toISOString()
  };

  // Save to both receipt and crrave_receipt in the new dedicated database
  await setDoc(doc(db, 'settings', 'receipt'), crraveSettings, { merge: true });
  await setDoc(doc(db, 'settings', 'crrave_receipt'), crraveSettings, { merge: true });
  console.log('Settings successfully seeded into new database.');

  // Seed Categories
  console.log(`Seeding ${CRRAVE_CATEGORIES.length} categories...`);
  const catBatch = writeBatch(db);
  for (const cat of CRRAVE_CATEGORIES) {
    const ref = doc(db, 'categories', cat.id);
    catBatch.set(ref, {
      name: cat.name,
      order: cat.order,
      createdAt: new Date().toISOString()
    });
  }
  await catBatch.commit();
  console.log('Categories seeded.');

  // Seed Menu Items
  console.log(`Seeding ${CRRAVE_MENU_ITEMS.length} dishes...`);
  const batchSize = 400;
  for (let i = 0; i < CRRAVE_MENU_ITEMS.length; i += batchSize) {
    const batch = writeBatch(db);
    const chunk = CRRAVE_MENU_ITEMS.slice(i, i + batchSize);
    for (const item of chunk) {
      const ref = doc(db, 'menu', item.id);
      batch.set(ref, {
        name: item.name,
        price: item.price,
        category: item.category,
        description: item.description || '',
        available: item.available !== false,
        order: item.order ?? 0,
        customizationType: item.customizationType || null,
        createdAt: new Date().toISOString()
      });
    }
    await batch.commit();
  }
  console.log('Menu items seeded.');

  // Verification
  const catSnap = await getDocs(collection(db, 'categories'));
  const menuSnap = await getDocs(collection(db, 'menu'));
  console.log('=== VERIFICATION OF NEW DATABASE ===');
  console.log('Categories in new DB:', catSnap.docs.length);
  console.log('Menu items in new DB:', menuSnap.docs.length);
  console.log('====================================');
  process.exit(0);
}

seedFreshDb().catch(err => {
  console.error('Seeding error:', err);
  process.exit(1);
});
