from PIL import Image

def remove_white_background():
    try:
        input_path = r'public/logos/logo_main_user.png'
        output_path = r'public/logos/logo_main_user_transparent.png'
        
        img = Image.open(input_path).convert("RGBA")
        datas = img.getdata()
        
        new_data = []
        for item in datas:
            # Check if pixel is white or very close to white
            # using a threshold for "near white" to catch anti-aliasing artifacts if any, 
            # though generated images might be pure white background.
            # let's use a high threshold like > 240 for all channels
            if item[0] > 240 and item[1] > 240 and item[2] > 240:
                new_data.append((255, 255, 255, 0)) # Transparent
            else:
                new_data.append(item)
        
        img.putdata(new_data)
        img.save(output_path, "PNG")
        print(f"Saved transparent logo to {output_path}")

    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    remove_white_background()
