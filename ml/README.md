# Infrastructure risk model

Real supervised ML, trained on `data/infrastructure_risk_ml_demo_dataset.csv` (80 rows, synthetic demo data).

    pip install -r ml/requirements.txt     # once
    python3 ml/train.py                    # retrain; prints CV metrics, writes ml/artifacts/
    npm run dev                            # server.ts auto-starts ml/service.py on 127.0.0.1:8765

* **Target:** `risk_score` (regression, 0-100). `risk_level` = LOW <35 <= MEDIUM <60 <= HIGH <80 <= CRITICAL, the
  convention the dataset follows (train.py asserts it reproduces all 80 labels).
* **Model:** Gradient Boosting, chosen over Ridge / Random Forest by repeated 5-fold CV (MAE 4.75 vs 4.92 / 5.37).
  Preprocessing (median imputation, ordinal condition encoding) is inside the same saved sklearn Pipeline.
* **Features (9):** complaint_count, complaints_last_7_days, complaints_last_30_days, complaint_severity_1_to_5,
  infrastructure_age_years, previous_incidents, maintenance_delay_days, unresolved_complaints,
  infrastructure_condition.
* **Evaluated and dropped** (CV MAE, GB): previous_risk_score (+0.4 MAE if removed, but live it would be fed by
  the model's own earlier output -> feedback loop); lat/lon/location/type (no gain, 5.21 -> 5.22-5.32, and they tie the model
  to the 7 demo cities); damage_frequency_per_month (+0.1, no reliable live equivalent). `infrastructure_id` is never
  used: the CSV's INF-001..080 are different assets from the app's INF-001..012.
* **Factors:** per-prediction marginal occlusion - each feature is swapped for training values and the drop in
  predicted score is its contribution; only drivers adding >= 2 points, with real (non-imputed) values, are reported.
* **Live feature mapping** (src/server/predictions.ts): counts/windows/severity from the `complaints` table,
  age/condition/past_failures/last_inspection from `infrastructure`. `maintenance_delay_days` = days since last
  inspection (proxy). Complaints are linked to assets by `asset_id`, else nearest type-compatible asset within 1.5 km.
