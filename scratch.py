import pandas as pd
import json

df = pd.read_excel(r"c:\Users\Kartik\OneDrive\Desktop\RM's\NAME.xlsx")
# Replace NaN with None for json compatibility
df = df.where(pd.notnull(df), None)
print(json.dumps(df.to_dict('records')))
