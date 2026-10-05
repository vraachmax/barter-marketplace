import base from './vehiclesdb-car-2026.09.1.json';
import supplement from './ru-car-supplement-2026.10.05.json';

// Append only: preserve all published IDs, labels and ordering from the base.
// A future base update must reconcile collisions explicitly, never silently merge.
export const CAR_CATALOG_REVISION = 3;
export const carCatalog = {
  makes: [...base.makes, ...supplement.makes],
  models: [...base.models, ...supplement.models],
};
const makes = new Set(carCatalog.makes.map(make => make.id));
if (makes.size !== carCatalog.makes.length ||
    new Set(carCatalog.models.map(model => model.id)).size !== carCatalog.models.length ||
    carCatalog.models.some(model => !makes.has(model.makeId))) {
  throw new Error('Car catalog contains duplicate IDs or missing parents');
}
