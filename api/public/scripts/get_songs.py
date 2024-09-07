import os
import json
import math
from mutagen.mp3 import MP3
from mutagen.easyid3 import EasyID3
import pathlib
import logging
from datetime import datetime
from rich.pretty import pprint
from rich import inspect
from pathlib import Path
from dotenv import dotenv_values

config = dotenv_values(".env")

logger = logging.getLogger(__name__)
DEFAULT = "Unknown"
AUDIO_DIR = Path("audio")
DATA_DIR = Path("data")
VERBOSITY = 0
AUDIO_EXTENSIONS = ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a', '.wma']


def get_timestamp():
  date = datetime.now()
  return f"{date.day}.{date.month}.{date.year}-{date.hour}:{date.minute}:{date.second}"

now = get_timestamp

def get_metadata(path):
  print("Processing: " + path)
  metadata = dict()
  mp3 = MP3(path)

  metadata['duration'] = math.floor(mp3.info.length)
  metadata['sample_rate'] = mp3.info.sample_rate
  metadata["path"] = path

  try:
    id3 = EasyID3(path)
  except:
    logger.info(f' {now()}: {path} Problem with ID3. Will skip this')
    metadata['artist'] = DEFAULT
    metadata['genre'] = DEFAULT
    metadata['BPM'] = DEFAULT
    return metadata

  try:
    metadata['artist'] = id3['artist'][0]
  except:
    logger.info(f' {now()}: {path} Artists not found in Metadata. Skip')
    metadata['artist'] = DEFAULT

  try:
    metadata['genre'] = id3['genre'][0]
  except:

    logger.info(f' {now()}: {path} Genre not found in Metadata. Skip')
    metadata['genre'] = DEFAULT
    
  try:
    metadata['BPM'] = id3['BPM'][0]
  except:
    logger.info(f' {now()}: {path} BPM not found in Metadata. Skip')
    metadata['BPM'] = DEFAULT
  
  mp3 = MP3(path)
  filename = mp3.filename

  # Get genre:
  # mp3.tags['TCON'].text

  # Get artists:
  # mp3.tags['TPE1'].text

  # Get valid ID3 keys:
    # EasyID3.valid_keys

  return metadata

def set_meta(path):
  audio = EasyID3(path)
  audio['genre'] = "Rock"
  audio['artist'] = "Default"
  audio['website'] = "https://messerblatt.com"
  audio['BPM'] = "Unknown"
  audio.save()

# Get depth of a dict
def depth(d):
  if isinstance(d, dict):
    return 1 + (max(map(depth, d.values())) if d else 0)
  return 0

def isMp3(file):
  return file.endswith(".mp3")

def get_folder_structure(path):
  """Returns a dictionary containing the folder structure of the supplied path."""

  folder_structure = {}
  for entry in os.listdir(path):
      entry_path = path + "/" + entry
      
      if os.path.isdir(entry_path):
          # If entry is a dict, recursively call the function and add the result to the dictionary
          folder_structure[entry] = get_folder_structure(entry_path)
      else:
        if entry_path.endswith(".mp3"):
            folder_structure[entry] = get_metadata(entry_path)

  if VERBOSITY >= 1:
    print("get_folder_structure(): ", folder_structure)
  
  with open("folders.json", "w") as f:
    json.dump(folder_structure, f, indent=4)
  return folder_structure


def find_audio_files(directory):
  '''Returns a list of all audio files in a DIR (and it's SUBDIRS)'''
  songs = []
  for root, _, files in os.walk(directory):
      for file in files:
          # Check for valid audio file extensions
          if any(file.lower().endswith(ext) for ext in AUDIO_EXTENSIONS):
              # Appends the **FULL** path to the list
              songs.append(root + "/" + file)
  logger.info(f' {now()}: {len(songs)} songs found')
  return songs

def create_csv_meta():
  songs = find_audio_files(AUDIO_DIR)
  metadata_json = dict()
  for song in songs:
    metadata = get_metadata(song)
    metadata_json[song] = metadata

  export_path = config['DATA_DIR'] + "/" + "metadata.json"
  with open(export_path, "w") as f:
    json.dump(metadata_json, f, indent=4)
  pprint(songs)


if __name__ == "__main__":


  logging.basicConfig(filename=config['LOGFILE'], level=logging.INFO)
  logger.info(f' {now()}: Start')

  folder_structure = get_folder_structure(config['AUDIO_DIR'])
  # pprint(folder_structure)
  logger.info(f' {now()}: folder_structure established')
  
  create_csv_meta()
  
  logger.info(f' {now()}: Finished')