import argparse
import os
import json
import pathlib
import logging
from datetime import datetime
from rich import inspect
from pathlib import PurePosixPath
from dotenv import dotenv_values
from mutagen.apev2 import APEv2

root = "../"
config = dotenv_values(root + "/.env")

AUDIO_DIR = root + config['AUDIO_DIR']
DATA_DIR = root + config['DATA_DIR']
AUDIO_EXTENSIONS = ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a', '.wma']

# Set up args-Flags
parser = argparse.ArgumentParser(description="To Debug, call script with --DEBUG=1")
parser.add_argument('--DEBUG', type=int, choices=[0, 1], default=0, 
                        help="Enable debug mode by setting --DEBUG=1 (default is 0).")

parser.add_argument('--RICH', type=int, choices=[0, 1], default=1, 
                        help="Enable sparse metadata annotation with --RICH=0 (default is 1).")

DEBUG = parser.parse_args().DEBUG
RICH = parser.parse_args().RICH

if DEBUG: print(config)

def debug(*args):
  from rich.pretty import pprint
  if DEBUG:
    pprint(args)

# Set up Logger
logger = logging.getLogger(__name__)
def now():
  date = datetime.now()
  return f"{date.day}.{date.month}.{date.year}-{date.hour}:{date.minute}:{date.second}"

def getAPEv2(file):
  debug("Processing: ", file)
  try:
    defined_meta = APEv2(file)
  except:
    debug("No APEv2 data found. Skip this...")
    return {"ERROR": 1}
  
  if RICH:
    # Get all possibleAPE2Tags
    APEv2Tags = dict()
    with open("APEv2Tags.json") as metadata_json:
      APEv2Tags = json.load(metadata_json)

    for key in APEv2Tags.keys():
      defined_meta[key] = defined_meta[key] if key in defined_meta.keys() else "-"
    
    defined_meta = {key: str(value) for key, value in zip(defined_meta.keys(), defined_meta.values())}
    debug("APEv2: ", defined_meta)
  return defined_meta

# Get depth of a dict
def depth(d):
  if isinstance(d, dict):
    return 1 + (max(map(depth, d.values())) if d else 0)
  return 0

def isMp3(file):
  return file.endswith(".mp3")


def get_folder_structure(path):
    dir_dict = {}
    for root, dirs, files in os.walk(path):
        folder_path = os.path.relpath(root, path)
        
        # Use folder path as the key and create sub-dictionaries for files
        if folder_path == '.':
            folder_path = os.path.basename(path)  # Root folder name
        dir_dict[folder_path] = {}

        # Iterate over each file and store the file's relative path
        for file in files:
            file_path = os.path.join("audio/", file)
            dir_dict[folder_path][file] = file_path
    del(dir_dict['audio'])
    return dir_dict



def find_audio_files(directory):
  '''Returns a list of all audio files in a DIR (and it's SUBDIRS)'''
  songs = []
  for root, _, files in os.walk(directory):
      for file in files:
          # Check for valid audio file extensions
          if any(file.lower().endswith(ext) for ext in AUDIO_EXTENSIONS):
              # Appends the **FULL** path to the list
              songs.append(root + "/" + file)

  # logger.info(f' {now()}: {len(songs)} songs found')
  return songs

def export_metadata():
  songs = find_audio_files(AUDIO_DIR)
  metadata_json = dict()
  for song in songs:
    metadata_json[song.split("/")[-1]] = getAPEv2(song)

  export_path = str(DATA_DIR) + "/" + "music_metadata.json"
  with open(export_path, "w") as f:
    json.dump(metadata_json, f, indent=4)
  debug(songs)


if __name__ == "__main__":
  # logger.info(f' {now()}: Start')
  folder_structure = get_folder_structure(AUDIO_DIR)

  with open(DATA_DIR + "/folders.json", "w") as f:
    json.dump(folder_structure, f, indent=4)

  # import pdb; pdb.set_trace()
  export_metadata()
  # logger.info(f' {now()}: Finished')
  print("OK")