import sys
import json
import pickle
import surprise
import pandas as pd
from collections import defaultdict
from surprise import Reader, Dataset
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_mysqldb import MySQL  # if using Flask-MySQLdb
import logging

logging.basicConfig(level=logging.INFO)
app = Flask(__name__)
CORS(app)

app.config['MYSQL_HOST'] = 'localhost'
app.config['MYSQL_USER'] = 'root'
app.config['MYSQL_PASSWORD'] = 'Nour@2002'
app.config['MYSQL_DB'] = 'sys'

# Initialize MySQL
mysql = MySQL(app)

def load_model():
    with open('Data/model.pkl', 'rb') as file:
        model = pickle.load(file)
    return model


# Executing an SQL query using the execute() method
def load_data():
        cur = mysql.connection.cursor()
        cur.execute("SELECT user_id, unique_isbn, book_title, book_rating, image_url_l FROM userAuth")
        results = cur.fetchall()
        cur.close()
        
        # Convert to DataFrame (assuming userAuth table has columns: user_id, unique_isbn, book_title, book_rating, image_url_l)
        df = pd.DataFrame(results, columns=['user_id', 'unique_isbn', 'book_title', 'book_rating', 'image_url_l'])
        return df


def get_top_n(predictions, n=10):
    top_n = defaultdict(list)
    for uid, iid, true_r, est, _ in predictions:
        top_n[uid].append((iid, est))
    for uid, user_ratings in top_n.items():
        user_ratings.sort(key=lambda x: x[1], reverse=True)
        top_n[uid] = user_ratings[:n]
    return top_n


def calculate_popularity(df, n=100):
    # Count the number of ratings for each book
    rating_count = df.groupby("book_title")["book_rating"].count().reset_index()
    rating_count.rename(columns={"book_rating": "NumberOfRate"}, inplace=True)

    # Calculate the average rating for each book
    rating_average = df.groupby("book_title")["book_rating"].mean().reset_index()
    rating_average.rename(columns={"book_rating": "AverageRatings"}, inplace=True)

    # Merge the counts and average ratings
    popular_books = rating_count.merge(rating_average, on="book_title")

    # Define the weighted rating function
    def weighted_rating(x):
        v = x["NumberOfRate"]  # Number of rate (ratings) for the book
        R = x["AverageRatings"]  # Average rating for the book
        C = popular_books["AverageRatings"].mean()  # Mean average rating for all books
        m = popular_books["NumberOfRate"].quantile(0.90)  # Books with more votes than this are considered for ranking

        # Calculate the weighted rating using the formula
        weighted_rating = (v / (v + m)) * R + (m / (v + m)) * C
        return weighted_rating

    # Filter out less popular books (with fewer votes) and calculate their popularity scores
    popular_books = popular_books[popular_books["NumberOfRate"] >= 250]
    popular_books["Popularity"] = popular_books.apply(weighted_rating, axis=1)

    # Sort the books by popularity in descending order
    popular_books = popular_books.sort_values(by="Popularity", ascending=False)
    popular_books=popular_books.reset_index(drop=True).reset_index()
    popular_books.index = popular_books.index + 1
    return popular_books[["book_title", "NumberOfRate", "AverageRatings", "Popularity"]].head(n)

@app.route('/recommend-register/', methods=['POST'])
def recommend1():
    # Load book data
    book_data = load_data()
    # Calculate popularity
    popular_books = calculate_popularity(book_data,10)
    reading_list = []
    for idx, row in popular_books.iterrows():
        book_id = row['book_title']
        rating = row['Popularity']
        book_info = book_data.loc[book_data['book_title'] == book_id].iloc[0]
        title = book_info['book_title']
        image_url = book_info['image_url_l']
        reading_list.append({'title': title, 'rating': rating, 'image_url': image_url})

    return jsonify({'recommendations': reading_list})

@app.route('/recommend-login/', methods=['POST'])
def recommend2():
    user_id = request.json['user_id']
    try:
        user_id = int(user_id)
    except ValueError:
        return jsonify({"error": "Please enter a valid integer ID."}), 400
    
    model = load_model()
    book_data = load_data()
    
    predictions = []
    unique_books = book_data['unique_isbn'].unique()
    
    for book_id in unique_books:
        predicted_rating = model.predict(user_id, book_id).est
        predictions.append((user_id, book_id, None, predicted_rating, None))
    
    top_n = get_top_n(predictions, n=10)

    def get_reading_list(userid):
        reading_list = []
        seen_titles = set()
        if userid in top_n:
            for book_id, rating in top_n[userid]:
                book_info = book_data.loc[book_data['unique_isbn'] == book_id].iloc[0]
                title = book_info['book_title']
                image_url = book_info['image_url_l']
                if title not in seen_titles:
                    reading_list.append({'title': title, 'rating': rating, 'image_url': image_url})
                    seen_titles.add(title)
                if len(reading_list) == 10:  # Stop once we have 10 unique books
                    break
        return reading_list

    reading_list = get_reading_list(user_id)
    
    return jsonify({'recommendations': reading_list})


if __name__ == "__main__":
    print("Model loaded successfully")
    app.run(host='0.0.0.0', port=5000, debug=True)

        




