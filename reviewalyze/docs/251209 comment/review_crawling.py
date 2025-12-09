from google_play_scraper import Sort, reviews
import pandas as pd
from datetime import datetime, timedelta

six_months_ago = datetime.now() - timedelta(days=180)

app_ids = [
    "easy.sudoku.puzzle.solver.free",
    "sudoku.puzzle.free.game.brain",
    "com.easybrain.sudoku.android",
    "com.gamovation.sudoku",
    "com.sudoku.puzzles.free.killer.classic.fun",
    "com.mathbrain.sudoku",
    "sudoku.puzzle.classic.math.games.train.brain",
    "com.conceptispuzzles.sudoku",
    "com.easybrain.killer.sudoku.free",
    "com.theangrykraken.sudoku"
]

for idx, app_id in enumerate(app_ids, start=1):

    review_list, _ = reviews(
        app_id,
        lang='ko',
        country='kr',
        sort=Sort.NEWEST,
        count=150
    )

    df = pd.DataFrame(review_list)

    df["date"] = df["at"].apply(lambda x: x.strftime("%Y-%m-%d") if pd.notnull(x) else None)

    df["at"] = pd.to_datetime(df["at"])
    filtered_df = df[df["at"] >= six_months_ago]

    final_df = filtered_df if len(filtered_df) >= 150 else df
    final_df = final_df[["reviewId", "content", "date", "score"]]

    file_name = f"reviews_sudoku{idx}.csv"
    final_df.to_csv(file_name, index=False, encoding='utf-8-sig')

print("완료!")
