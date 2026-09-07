Recorded 2026-09-07 after candidate model/accessory guards. Compare with BASELINE.md;
corpus and judgments unchanged. Relevant DB path only, not a live index measurement.
The remaining forbidden result for `фотоаппарат canon` is a synthetic mock-up in a
broad query; do not hardcode its ID or model to make the benchmark pass.

# Offline search: model/accessory guards

Synthetic fixtures; actual ListingsService with in-memory query execution. Not a live PostgreSQL/Meili or UX benchmark.

```json
{
  "development": {
    "queries": 48,
    "ndcg10": 0.6428571428571429,
    "recall20": 0.6428571428571429,
    "emptyResults": 21,
    "forbiddenQueries": 0,
    "negativeFailures": 0
  },
  "holdout": {
    "queries": 12,
    "ndcg10": 0.5833333333333334,
    "recall20": 0.5833333333333334,
    "emptyResults": 5,
    "forbiddenQueries": 1,
    "negativeFailures": 0
  }
}
```

| Query | Expected | Returned top 5 | Forbidden |
|---|---|---|---|
| айфно 14 pro | iphone14 | (empty) |  |
| soni ps5 | ps5 | (empty) |  |
| macbok air m2 | macbook | (empty) |  |
| ipda air | ipad | (empty) |  |
| веласипед stels | bike | (empty) |  |
| диван для маленькой комнаты | sofa | (empty) |  |
| деван | sofa | (empty) |  |
| экскаватор в аренду | excavator | (empty) |  |
| аренда экскаватра | excavator | (empty) |  |
| двухкомнатная квартира | flat | (empty) |  |
| продажа квартры | flat | (empty) |  |
| шуруповёрт makita | drill | (empty) |  |
| makta ddf484 | drill | (empty) |  |
| каляска прогулочная | stroller | (empty) |  |
| yamha f310 | guitar | (empty) |  |
| фотоаппарат canon | camera | camera, r60 | r60 |
| cannon r6 | camera | (empty) |  |
| автокарн 80 | crane | (empty) |  |
| зимняя резина 205 55 r16 | tyres | (empty) |  |
| шыны 205 55 r16 | tyres | (empty) |  |
| ninebt g30 | scooter | (empty) |  |
