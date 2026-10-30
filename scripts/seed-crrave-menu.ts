import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  writeBatch 
} from 'firebase/firestore';
import config from '../firebase-applet-config.json' with { type: 'json' };
import { CRRAVE_CATEGORIES, CRRAVE_MENU_ITEMS } from '../src/data/crraveMenuData.ts';

async function seed() {
  console.log('=== STARTING CRRAVE LEYTON MENU MIGRATION ===');
  const app = initializeApp(config);
  const auth = getAuth(app);
  const cred = await signInAnonymously(auth);
  const db = getFirestore(app, config.firestoreDatabaseId);

  // Elevate session to admin role
  await setDoc(doc(db, 'users', cred.user.uid), {
    name: 'Crrave Admin Migration',
    email: 'crraveleyton@gmail.com',
    role: 'admin',
  });
  console.log('Admin session active:', cred.user.uid);

  // 1. Delete all existing menu items
  const menuSnap = await getDocs(collection(db, 'menu'));
  console.log(`Found ${menuSnap.docs.length} existing items in 'menu' to remove.`);
  const batchSize = 400;
  for (let i = 0; i < menuSnap.docs.length; i += batchSize) {
    const batch = writeBatch(db);
    const chunk = menuSnap.docs.slice(i, i + batchSize);
    chunk.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
  console.log('Old menu items completely deleted.');

  // 2. Delete all existing categories
  const catSnap = await getDocs(collection(db, 'categories'));
  console.log(`Found ${catSnap.docs.length} existing categories in 'categories' to remove.`);
  for (let i = 0; i < catSnap.docs.length; i += batchSize) {
    const batch = writeBatch(db);
    const chunk = catSnap.docs.slice(i, i + batchSize);
    chunk.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
  console.log('Old categories completely deleted.');

  // 3. Delete old meat options
  const meatSnap = await getDocs(collection(db, 'meatOptions'));
  console.log(`Found ${meatSnap.docs.length} old meat options to remove.`);
  for (let i = 0; i < meatSnap.docs.length; i += batchSize) {
    const batch = writeBatch(db);
    const chunk = meatSnap.docs.slice(i, i + batchSize);
    chunk.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
  console.log('Old meat options cleaned.');

  // 4. Insert New Categories
  console.log(`Inserting ${CRRAVE_CATEGORIES.length} CRRAVE Leyton categories...`);
  const catBatch = writeBatch(db);
  for (const cat of CRRAVE_CATEGORIES) {
    const ref = doc(db, 'categories', cat.id);
    catBatch.set(ref, {
      name: cat.name,
      order: cat.order,
      createdAt: new Date().toISOString(),
    });
  }
  await catBatch.commit();
  console.log('Categories successfully inserted.');

  // 5. Insert New Menu Items
  console.log(`Inserting ${CRRAVE_MENU_ITEMS.length} CRRAVE Leyton menu items...`);
  for (let i = 0; i < CRRAVE_MENU_ITEMS.length; i += batchSize) {
    const batch = writeBatch(db);
    const chunk = CRRAVE_MENU_ITEMS.slice(i, i + batchSize);
    for (const item of chunk) {
      const ref = doc(db, 'menu', item.id);
      batch.set(ref, {
        name: item.name,
        price: item.price,
        category: item.category,
        description: item.description,
        order: item.order,
        available: item.available,
        customizationType: item.customizationType || null,
        createdAt: new Date().toISOString(),
      });
    }
    await batch.commit();
  }
  console.log('Menu items successfully inserted.');

  // 6. Verify final state
  const verifyMenu = await getDocs(collection(db, 'menu'));
  const verifyCats = await getDocs(collection(db, 'categories'));
  console.log(`VERIFICATION: Current menu items in DB: ${verifyMenu.docs.length}`);
  console.log(`VERIFICATION: Current categories in DB: ${verifyCats.docs.length}`);
  console.log('=== MIGRATION COMPLETED SUCCESSFULLY ===');
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
