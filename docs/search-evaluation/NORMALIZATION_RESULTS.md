2026-09-07. Same authored, already-inspected corpus as BASELINE.md and MODEL_GUARD_RESULTS.md.
Not a live or blind benchmark. Original judgments unchanged. Scoped dictionary/typo
normalization improves retrieval; short/unknown brands and semantic needs remain.

# Offline search baseline

Synthetic fixtures; actual ListingsService with in-memory query execution. Not a live PostgreSQL/Meili or UX benchmark.

```json
{
  "development": {
    "queries": 48,
    "ndcg10": 0.8571428571428571,
    "recall20": 0.8571428571428571,
    "emptyResults": 12,
    "forbiddenQueries": 0,
    "negativeFailures": 0
  },
  "holdout": {
    "queries": 12,
    "ndcg10": 0.6666666666666666,
    "recall20": 0.6666666666666666,
    "emptyResults": 4,
    "forbiddenQueries": 1,
    "negativeFailures": 0
  }
}
```

| Query | Expected | Returned top 5 | Forbidden |
|---|---|---|---|
| soni ps5 | ps5 | (empty) |  |
| ipda air | ipad | (empty) |  |
| диван для маленькой комнаты | sofa | (empty) |  |
| двухкомнатная квартира | flat | (empty) |  |
| makta ddf484 | drill | (empty) |  |
| yamha f310 | guitar | (empty) |  |
| фотоаппарат canon | camera | camera, r60 | r60 |
| cannon r6 | camera | (empty) |  |
| зимняя резина 205 55 r16 | tyres | (empty) |  |
| шыны 205 55 r16 | tyres | (empty) |  |
| ninebt g30 | scooter | (empty) |  |
