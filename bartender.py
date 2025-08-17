from flask import Flask, request, jsonify
from openai import OpenAI
import os
from flask_cors import CORS
import uuid
import re
import logging
from concurrent.futures import ThreadPoolExecutor
import json

logging.basicConfig(level=logging.DEBUG)

# Suppress excessive debug logging from libraries like httpx and httpcore
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)
logging.getLogger("openai").setLevel(logging.WARNING)
app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)

# Initialize OpenAI client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Define a simple filter function for Werkzeug logs
def werkzeug_filter(record):
    # Suppress 'Bad request' messages and malformed binary sequences
    message = record.getMessage()
    
    # Suppress specific bad request versions or malformed binary sequences
    if 'code 400, message Bad request' in message:
        return False
    
    # Suppress messages with non-ASCII characters (which are common in binary junk requests)
    if re.search(r'\\x[0-9a-fA-F]{2}', message):
        return False
    
    # Suppress regular HTTP GET and POST request logs
    if 'GET' in message or 'POST' in message:
        return False 
    return True

# Apply the filter to Werkzeug logger
werkzeug_logger = logging.getLogger('werkzeug')
werkzeug_logger.addFilter(werkzeug_filter)

logging.basicConfig(level=logging.DEBUG, format='%(levelname)s:%(name)s:%(message)s')

app_logger = logging.getLogger('root')  # application logs
app_logger.setLevel(logging.DEBUG)
logging.basicConfig(level=logging.DEBUG)


def load_systembolaget_data():
    try:
        with open('/etc/nginx/sites-available/systembolagetdict.json', 'r') as file:
            systembolaget_data = json.load(file)
            
        # Validate the data to ensure every entry has "Style_Name"
        for item in systembolaget_data:
            if 'Style_Name' not in item or not item['Style_Name']:
                logging.error(f"Invalid entry found: {item}")
        
        return systembolaget_data
    except FileNotFoundError:
        logging.error("Systembolaget JSON file not found.")
        return []
    except json.JSONDecodeError:
        logging.error("Error decoding Systembolaget JSON file.")
        return []

# Current inventory of drinks 
def load_main_drinks_data():
    try:
        with open('/etc/nginx/sites-available/main_drinks.json', 'r') as f:
            data = json.load(f)

        for item in data:
            if 'Style_Name' not in item or not item['Style_Name']:
                logging.error(f"Invalid main_drink entry (missing Style_Name): {item}")
        return data
    except FileNotFoundError:
        logging.error("Main drinks JSON file not found.")
        return []
    except json.JSONDecodeError:
        logging.error("Error decoding main drinks JSON file.")
        return []

main_drinks = load_main_drinks_data()
system_bolaget_dictionary = load_systembolaget_data()


questions_with_answers = [
    {
        "index": 0,  # Set this as the first question
        "question": "What type of drink do you prefer?",
        "answers": ["Beer", "White Wine", "Red Wine"],
        "multiple": False,
        "requiredSelections": 1 
    },
    {
        "index": 1,  # Conditional flavor question for beer, red wine, and white wine
        "question": "What kind of flavor are you in the mood for tonight?",
        "answers": [],  # This will be dynamically filled based on drink type
        "multiple": True,
        "conditional": True,
        "requiredSelections": 3,
        "depends_on": {"index": 0, "answer": ["Beer", "White wine", "Red wine"]}  # Show for all drinks
    },
    {
        "index": 2,  # Alcohol preference question
        "question": "How strong do you want your drink to be?",
        "answers": [],  # We'll fill this dynamically based on the drink type (beer or wine)
        "multiple": False,
        "requiredSelections": 1,
        "conditional": True,
        "depends_on": {"index": 0, "answer": ["Beer", "White wine", "Red wine"]}  # Show for all drinks
    },
    {
        "index": 3,  # Final question about location
        "question": "Where do you prefer to drink your beer or wine?",
        "answers": ["Gathering", "BBQ", "Night in", "Celebration", "By the sea", "Hogwarts"],
        "requiredSelections": 1,
        "multiple": False,
        "last": True  # This is the last question
    }
]



user_sessions = {}


# Utility functions to manage session state for each user
def get_session(user_id):
    if user_id not in user_sessions:
        user_sessions[user_id] = {'question_index': 0, 'enable_speech': True}  # Default enable_speech to True
    return user_sessions[user_id]

@app.route('/api/start', methods=['GET'])
def start_session():
    user_id = str(uuid.uuid4())  # Generate a unique user session ID
    # Initialize session data including an empty list for user_responses
    user_sessions[user_id] = {'question_index': 0, 'enable_speech': True, 'user_responses': []}  
    return jsonify({'user_id': user_id, 'enable_speech': True}), 200  # Return user_id and enable_speech status

@app.route('/api/toggle-speech', methods=['POST'])
def toggle_speech():
    user_data = request.json
    user_id = user_data.get('user_id')
    enable_speech = user_data.get('enable_speech')

    if not user_id or user_id not in user_sessions:
        return jsonify({'error': 'Invalid session or user_id'}), 400

    # Update the session's enable_speech status
    user_sessions[user_id]['enable_speech'] = enable_speech
    return jsonify({'status': 'Speech toggle updated successfully!', 'enable_speech': enable_speech}), 200



@app.route('/api/question', methods=['GET'])
def get_question():
    user_id = request.args.get('user_id')
    if not user_id or user_id not in user_sessions:
        return jsonify({'error': 'Invalid session or user_id'}), 400

    session_data = get_session(user_id)
    question_index = session_data['question_index']

    # Sort the questions based on the 'index' field
    sorted_questions = sorted(questions_with_answers, key=lambda q: q['index'])

    # Ensure we do not exceed the bounds of the sorted_questions list
    if question_index >= len(sorted_questions):
        return jsonify({'error': 'No more questions available.'}), 400

    # Get the current question based on the question index
    current_question_data = sorted_questions[question_index]


    if question_index == 1:
        previous_answer = session_data['user_responses'][0]  # Get the drink type
        if previous_answer.lower() == "beer":
            current_question_data['answers'] = ["Light", "Fruity", "Malty", "Dark", "Sour", "Wheat beer"]
        elif previous_answer.lower() == "red wine":
            current_question_data['answers'] = ["Fruity", "Spicy", "Oaked", "Tannic", "Acidic", "Earthy"]
        elif previous_answer.lower() == "white wine":
            current_question_data['answers'] = ["Fruity", "Floral", "Mineral", "Spicy", "Acidic", "Buttery"]
    # Set alcohol-level answers based on drink type (beer or wine) after flavor question
    if question_index == 2:
        previous_answer = session_data['user_responses'][0]
        if previous_answer.lower() == "beer":
            current_question_data['answers'] = ["Low", "Medium", "High", "Non-alcoholic"]
        elif previous_answer.lower() in ["red wine", "white wine"]:
            current_question_data['answers'] = ["Low", "Medium", "High"]


    # Check for conditionally skipped questions (Flavors for beer, red wine, or white wine)
    if "conditional" in current_question_data:
        condition = current_question_data.get('depends_on')
        previous_answer = session_data['user_responses'][condition['index']]

        # Skip this question if the condition is not met
        if previous_answer.lower() not in [ans.lower() for ans in condition['answer']]:
            session_data['question_index'] += 1  # Increment the question index
            return get_question()  # Recursively call to get the next valid question

    if question_index == 3:
        drink_type = session_data['user_responses'][0].lower()
        if drink_type == "beer":
            current_question_data['question'] = "Where do you prefer to drink your beer?"
        elif drink_type in ["red wine", "white wine"]:
            current_question_data['question'] = f"Where do you prefer to drink your {drink_type}?"

    # Prepare the response
    current_question = current_question_data["question"]
    current_answers = current_question_data["answers"]
    required_selections = current_question_data.get("requiredSelections", 1)  # Get requiredSelections or default to 1
    multiple = current_question_data["multiple"]
    last_question = current_question_data.get("last", False)

    return jsonify({
        'question': current_question,
        'answers': current_answers,
        'requiredSelections': required_selections,
        'multiple': multiple,
        'last': last_question
    })




def generate_gpt_prompt(main_recommendation, occasion_preference):
    drink_name = main_recommendation['Style_Name']
    flavor_profile = main_recommendation.get('flavor_profile', 'flavorful')
    pairing = main_recommendation.get('pairing', 'any meal')
    alcohol_content = main_recommendation.get('alcohol_content', 'unknown')
    
    if occasion_preference == "hogwarts":
        gpt_prompt = (f"As a magical bartender, recommend {drink_name} for someone at Hogwarts. "
                      f"Talk about how its {flavor_profile} flavors make it feel magical, "
                      f"and suggest pairing it with something fun from Hogwarts cuisine. "
                      f"Add a bit of whimsy and fun! Limit to three rows")
    elif occasion_preference == "bbq":
        gpt_prompt = (f"Recommend {drink_name} for a BBQ lover. "
                      f"Talk about how its {flavor_profile} profile complements smoky BBQ flavors, "
                      f"and suggest pairing it with grilled meats or veggies. "
                      f"Make it warm and friendly, perfect for an outdoor event. Limit to three rows")
    elif occasion_preference == "gathering":
        gpt_prompt = (f"Recommend {drink_name} for a social gathering. "
                      f"Describe how its {flavor_profile} flavors make it perfect for sharing with friends, "
                      f"and suggest pairing it with finger foods or light appetizers. "
                      f"Make it sound like the drink that brings people together. Limit to three rows")
    elif occasion_preference == "celebration":
        gpt_prompt = (f"Suggest {drink_name} for a celebratory occasion. "
                      f"Talk about how its {flavor_profile} profile makes it perfect for toasting "
                      f"to special moments, and mention pairing it with desserts or rich foods. "
                      f"Make it sound festive and exciting! Limit to three rows")
    elif occasion_preference == "night in":
        gpt_prompt = (f"Recommend {drink_name} for a cozy night in. "
                      f"Talk about how its {flavor_profile} flavors create a relaxing atmosphere, "
                      f"and suggest pairing it with comfort food or a good movie. "
                      f"Make it sound like the ultimate comfort drink. Limit to three rows")
    elif occasion_preference == "by the sea":
        gpt_prompt = (f"Recommend {drink_name} for enjoying by the sea. "
                      f"Describe how its {flavor_profile} flavors complement the salty sea air, "
                      f"and suggest pairing it with seafood or a beach picnic. "
                      f"Make it sound refreshing and relaxing. Limit to three rows")
    else:
        gpt_prompt = (f"Recommend {drink_name} for an occasion like {occasion_preference}. "
                      f"Talk about its {flavor_profile} profile and suggest a great pairing. "
                      f"Keep it friendly and engaging! Limit to three rows")
    
    return gpt_prompt







@app.route('/api/answer', methods=['POST'])
def post_answer():
    user_data = request.json
    user_id = user_data.get('user_id')
    answer = user_data.get('answer')

    if not user_id or user_id not in user_sessions:
        return jsonify({'error': 'Invalid session or user_id'}), 400


#question_index = session_data['question_index']
    session_data = get_session(user_id)  # Fetch the session data
    question_index = session_data['question_index']  # Now access the question_index

    # If the answer is an array, take the first value (as only one answer is expected for each question)
    if isinstance(answer, list):
        answer = answer[0]

    # Store the user's response as a string in the session data
    session_data['user_responses'].append(answer)
    # Increment the question index to move to the next question
    session_data['question_index'] += 1

    print(f"User responses so far: {session_data['user_responses']}")  # Debugging line

    # Determine whether the user selected beer, red wine, or white wine
    drink_type = session_data['user_responses'][0].lower()

    # Check if the current question index indicates the last question based on the drink type
    is_beer = drink_type == "beer"
    last_question_index = 3 

    if question_index == last_question_index:  # Trigger the recommendation at the correct index
        # Call the function to get the recommendations
        recommended_drinks = recommend_drinks(session_data['user_responses'])

        # Check if the recommendation returned an error or warning
        if 'error' in recommended_drinks:
            return jsonify({
                'response': recommended_drinks['error']
            }), 400
        elif 'warning' in recommended_drinks:
            return jsonify({
                'response': recommended_drinks['warning']
            }), 200

        # Get the two drinks
        main_recommendation = recommended_drinks.get('main_recommendation')
        systembolaget_recommendation = recommended_drinks.get('systembolaget_recommendation')

        # Ensure both 'Style_Name' exists in the recommendations
        if not main_recommendation or not systembolaget_recommendation:
            return jsonify({'error': 'No matching drinks found.'}), 400

        # Log full details for the main drink
        logging.info(f"""
        Main Drink Recommendation:
        Name: {main_recommendation['Style_Name']}
        Description: {main_recommendation['description']}
        Flavor Profile: {main_recommendation['flavor_profile']}
        Alcohol Content: {main_recommendation.get('alcohol_content', 'N/A')}
        Pairing: {main_recommendation['pairing']}
        Occasion: {main_recommendation['occasion']}
        Category: {main_recommendation['category']}
        Image Name: {main_recommendation.get('Image_name', 'N/A')}
        Image Icon: {main_recommendation.get('Image_Icon', 'N/A')}
        """)

        # Log full details for the systembolaget drink
        logging.info(f"""
        Systembolaget Drink Recommendation:
        Name: {systembolaget_recommendation['Style_Name']}
        Description: {systembolaget_recommendation['description']}
        Flavor Profile: {systembolaget_recommendation['flavor_profile']}
        Alcohol Content: {systembolaget_recommendation.get('alcohol_content', 'N/A')}
        Pairing: {systembolaget_recommendation['pairing']}
        Occasion: {systembolaget_recommendation['occasion']}
        Category: {systembolaget_recommendation['category']}
        Image Name: {systembolaget_recommendation.get('Image_name', 'N/A')}
        Image Icon: {systembolaget_recommendation.get('Image_Icon', 'N/A')}
        """)

        # TextExpo drink recommendation details
        drink_details = f"""
            <strong>Main Drink Name:</strong> {main_recommendation['Style_Name']}<br>
            <strong>Description:</strong> {main_recommendation['description']}<br>
            <strong>Flavor Profile:</strong> {main_recommendation['flavor_profile']}<br>
            <strong>Alcohol Content:</strong> {main_recommendation.get('alcohol_content', 'N/A')}<br>
            <strong>Pairing:</strong> {main_recommendation['pairing']}<br>
            <strong>Occasion:</strong> {main_recommendation['occasion']}<br>
            <strong>Category:</strong> {main_recommendation['category']}<br>
        """

        systembolaget_drink_details = f"""
            <strong>Systembolaget Drink Name:</strong> {systembolaget_recommendation['Style_Name']}<br>
            <strong>Description:</strong> {systembolaget_recommendation['description']}<br>
            <strong>Flavor Profile:</strong> {systembolaget_recommendation['flavor_profile']}<br>
            <strong>Alcohol Content:</strong> {systembolaget_recommendation.get('alcohol_content', 'N/A')}<br>
            <strong>Pairing:</strong> {systembolaget_recommendation['pairing']}<br>
            <strong>Occasion:</strong> {systembolaget_recommendation['occasion']}<br>
            <strong>Category:</strong> {systembolaget_recommendation['category']}<br>
        """

        # Generate GPT response based on the occasion
        occasion_preference = session_data['user_responses'][-1]  # Last user response is the occasion

        gpt_prompt = generate_gpt_prompt(main_recommendation, occasion_preference)



        # Generate the final chatbot response using GPT based on user preferences and the recommended drink
        chat_completion = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a professional friendly and fun bartender who loves recommending drinks."},
                {"role": "user", "content": gpt_prompt}
            ],
            temperature=0.7,
            max_tokens=300
        )

        gpt_response = chat_completion.choices[0].message.content

        # Combine the GPT response with the full drink recommendation

        #full_response = f"{gpt_response}<br><br>Here are the full details of the recommended drink:<br>{drink_details}<br>{systembolaget_drink_details}"

        full_response = f"{gpt_response}"
        #full_response = f"{gpt_response}<br><br><br>{drink_details}<br>{systembolaget_drink_details}"

        # Return the GPT response along with the full drink recommendation details
        return jsonify({
            'drink': main_recommendation,  # Return the main drink recommendation
            'systembolaget_drink': systembolaget_recommendation,  # Return the systembolaget recommendation
            'response': full_response  # Include GPT-generated message and drink details
        }), 200


    # If there are still more questions, generate a fun GPT response based on the user's answer so far
    if question_index == 0:
        prompt = f"Be a cheeky sarcastic intelligent bartender and respond to the user's {answer} drink preference. Make it fun and intelligent! Don't provide a recommendation yet. no more than two lines of response"
    elif question_index == 1:
        prompt = f"The user prefers flavor profile {answer}. Give a sarcastic and naugthy response. but don't provide a recommendation yet. no more than two lines of response"
    elif question_index == 2:
        if drink_type == "beer":
            prompt = f"The user prefers a beer with {answer} alcohol content. Give a sarcastic response but don't provide a recommendation yet. Don't ask any further questions.  no more than two lines of response"
        elif drink_type in ["red wine", "white wine"]:
            prompt = f"The user selected wine, and they prefer {answer} wine. Be charming and fun but don't recommend a specific drink yet. Don't ask any further questions.  no more than two lines of response"
#    elif question_index == 3:
#        prompt = f"The user prefers to drink at {answer}. Respond with a witty and engaging comment!"

    # Generate GPT response for non-final questions
    chat_completion = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[
            {"role": "system", "content": "You are a friendly bartender."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.7,
        max_tokens=100
    )
    gpt_response = chat_completion.choices[0].message.content

    return jsonify({'response': gpt_response})

def filter_by_category(drinks, category_preference):
    try:
        filtered = [drink for drink in drinks if drink['category'].lower() == category_preference.lower()]
        if not filtered:
            logging.error(f"No drinks found for category: {category_preference}")
        return filtered
    except Exception as e:
        logging.error(f"Error filtering by category: {e}")
        return []


def recommend_drinks(user_responses):
    try:
        category_preference = user_responses[0].lower().strip()
        logging.debug(f"User's category preference: {category_preference}")

        # Filter the drinks by the chosen category for both dictionaries
        drinks_from_main = filter_by_category(main_drinks, category_preference)
        drinks_from_systembolaget = filter_by_category(system_bolaget_dictionary, category_preference)

        if not drinks_from_main and not drinks_from_systembolaget:
            return {"error": f"No drinks found in category '{category_preference}'."}

        # Determine if the user selected beer or wine
        if category_preference == "beer":
            main_recommendation = recommend_beer(drinks_from_main, user_responses) if drinks_from_main else None
            systembolaget_recommendation = recommend_beer(drinks_from_systembolaget, user_responses) if drinks_from_systembolaget else None
        elif category_preference in ["red wine", "white wine"]:
            main_recommendation = recommend_wine(drinks_from_main, user_responses) if drinks_from_main else None
            systembolaget_recommendation = recommend_wine(drinks_from_systembolaget, user_responses) if drinks_from_systembolaget else None
        else:
            return {"error": "Invalid category preference. Only beer, red wine, and white wine are supported."}

        if not main_recommendation:
            return {"error": "No matching drink found in the main dictionary."}
        if not systembolaget_recommendation:
            return {"error": "No matching drink found in systembolaget."}

        return {
            'main_recommendation': main_recommendation,
            'systembolaget_recommendation': systembolaget_recommendation,
        }
    except Exception as e:
        logging.error(f"Error in recommend_drink: {e}")
        return {"error": "There was an issue with your request."}



# Scoring based on flavor match for beer
def score_beer(drink, flavor_preferences):
    flavor_score = sum(1 for flavor in flavor_preferences if flavor in drink['flavor_profile'].lower())
    return flavor_score



def recommend_beer(drinks, user_responses):
    try:
        # Extract flavor preference and alcohol level
        flavor_preferences = [flavor.lower().strip() for flavor in user_responses[1].split(',')]
        alcohol_level = str(user_responses[2]).lower().strip()

        logging.debug(f"Beer flavor preferences: {flavor_preferences}, alcohol level: {alcohol_level}")

        # Treat "low" as "medium"
        if alcohol_level == "low":
            logging.info(f"User selected 'low', defaulting to 'medium'")
            alcohol_level = "medium"

        # Filter by alcohol level, adding support for 'non-alcoholic' as level "0"
        if alcohol_level == "medium":
            filtered_by_alcohol = [drink for drink in drinks if str(drink.get('level', '')).lower() == "medium"]
        elif alcohol_level == "high":
            filtered_by_alcohol = [drink for drink in drinks if str(drink.get('level', '')).lower() == "high"]
        elif alcohol_level == "non-alcoholic":
            # Match beers with level "0" or alcohol_content == 0.0
            filtered_by_alcohol = [drink for drink in drinks if str(drink.get('level', '')).lower() == "0" or drink.get('alcohol_content') == 0.0]
        else:
            logging.error(f"Invalid alcohol level: {alcohol_level}")
            return {"error": "Invalid alcohol level selected."}

        # Check if any drinks matched the alcohol level filter
        if not filtered_by_alcohol:
            logging.info(f"No beers found with alcohol level: {alcohol_level}")
            return {"error": f"No beers found with alcohol level '{alcohol_level}'."}

        # Score and filter by flavor
        scored_beers = [(score_beer(drink, flavor_preferences), drink) for drink in filtered_by_alcohol]

        # Sort beers by flavor score
        scored_beers.sort(key=lambda x: x[0], reverse=True)

        # Check if any beers were scored (i.e., if any matched flavors)
        if scored_beers and scored_beers[0][0] > 0:
            return scored_beers[0][1]  # Return the beer with the highest score
        else:
            logging.info(f"No exact beer match found for flavors: {flavor_preferences}")
            # Return the first beer matching alcohol level if no exact flavor match is found
            return filtered_by_alcohol[0] if filtered_by_alcohol else {"error": "No beers found."}

    except Exception as e:
        logging.error(f"Error in recommend_beer: {e}")
        return {"error": "There was an issue with your beer recommendation."}






def score_wine(drink, flavor_preferences, occasion_preference):
    # Safely get the flavor profile or default to an empty string
    flavor_profile = drink.get('flavor_profile', '').lower()
    
    if not flavor_profile:
        logging.error(f"Missing 'flavor_profile' for drink: {drink.get('Style_Name', 'Unknown')}")
    
    flavor_score = sum(1 for flavor in flavor_preferences if flavor in flavor_profile)
    occasion_match = occasion_preference in drink.get('occasion', '').lower()
    
    return flavor_score, occasion_match


def recommend_wine(drinks, user_responses):
    try:
        # Extract flavor preferences and occasion
        flavor_preferences = [flavor.lower().strip() for flavor in user_responses[1].split(',')]
        occasion_preference = user_responses[2].lower().strip()

        logging.debug(f"Wine flavor preferences: {flavor_preferences}, occasion: {occasion_preference}")

        # Directly return McGuigan Estate Chardonnay if white wine is selected
        for drink in drinks:
            if drink.get('Style_Name').lower() == "Leva Riesling":
                logging.info("McGuigan Estate Chardonnay selected as the white wine recommendation.")
                return drink

            # Directly return McGuigan Estate Shiraz if red wine is selected
            if drink.get('Style_Name').lower() == "Piemonte Barbera":
                logging.info("McGuigan Estate Shiraz selected as the red wine recommendation.")
                return drink

        # Score and filter by flavor and occasion if no hardcoded match
        scored_wines = [(score_wine(drink, flavor_preferences, occasion_preference), drink) for drink in drinks]

        # Sort wines by flavor match (higher score) and then occasion match
        scored_wines.sort(key=lambda x: (x[0][0], x[0][1]), reverse=True)

        # Log the filtered and sorted results
        logging.debug(f"Sorted wine recommendations: {[drink['Style_Name'] for _, drink in scored_wines]}")

        # Return the top match (best flavor and occasion match)
        if scored_wines:
            return scored_wines[0][1]
        else:
            logging.info(f"No exact wine match found for flavors: {flavor_preferences}")
            return drinks[0]  # Fallback: return first wine if no exact match

    except Exception as e:
        logging.error(f"Error in recommend_wine: {e}")
        return {"error": "There was an issue with your wine recommendation."}


@app.route('/api/reset', methods=['POST'])
def reset_session():
    user_data = request.json
    user_id = user_data.get('user_id')

    if not user_id or user_id not in user_sessions:
        return jsonify({'error': 'Invalid session or user_id'}), 400

    # Clear the user responses when resetting
    user_sessions[user_id]['question_index'] = 0  # Reset the user's question index
    user_sessions[user_id]['user_responses'] = []  # Clear previous responses
    return jsonify({'status': 'Session reset successfully!'}), 200





if __name__ == '__main__':
#app.run(host='0.0.0.0', port=5000)
    app.run(host='0.0.0.0', port=5012, debug=True)
