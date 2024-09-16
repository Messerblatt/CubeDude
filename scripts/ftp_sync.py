import ftplib
import os
from rich.progress import Progress
from rich.pretty import pprint
from dotenv import dotenv_values

def file_exists(ftp, remote_file_path):
    """
    Check if a file exists on the FTP server.

    :param ftp: FTP connection object
    :param remote_file_path: Path to the file on the FTP server
    :return: True if the file exists, False otherwise
    """
    try:
        ftp.size(remote_file_path)
        return True
    except ftplib.error_perm:
        return False

def upload_folder_to_ftp(ftp, local_folder, remote_folder):
    """
    Uploads a folder to an FTP server while preserving the folder structure
    and skipping files that already exist.

    :param ftp: FTP connection object
    :param local_folder: Path to the local folder to upload
    :param remote_folder: Path to the remote folder where files will be uploaded
    """

    # List all files that need to be uploaded
    files_to_upload = []
    for root, _, files in os.walk(local_folder):
        for file in files:
            files_to_upload.append(os.path.join(root, file))

    # Initialize progress bar
    total_files = len(files_to_upload)
    uploaded_files = 0

    with Progress() as progress:
        task = progress.add_task("[cyan]Uploading files...", total=total_files)

        # Recursively upload the contents of the local folder
        for root, dirs, files in os.walk(local_folder):
            relative_path = os.path.relpath(root, local_folder)
            remote_path = os.path.join(remote_folder, relative_path).replace('\\', '/')

            # Ensure the corresponding remote directory exists
            try:
                ftp.cwd(remote_path)
            except ftplib.error_perm:
                ftp.mkd(remote_path)
                ftp.cwd(remote_path)

            # Upload files in the current directory
            for file in files:
                local_file_path = os.path.join(root, file)
                remote_file_path = os.path.join(remote_path, file).replace('\\', '/')

                # Check if the file already exists on the remote server
                if not file_exists(ftp, remote_file_path):
                    with open(local_file_path, 'rb') as f:
                        ftp.storbinary(f'STOR {remote_file_path}', f)
                    uploaded_files += 1
                    progress.update(task, advance=1, description=f"Uploading {file} [{uploaded_files}/{total_files}]")
                else:
                    pprint(f"Already existing: {file}")
                    progress.update(task, advance=1, description=f"Skipping {file} [{uploaded_files}/{total_files}]")

if __name__ == '__main__':

    config = dotenv_values(".env")

    ftp_server = config['X']
    ftp_username = config['XX']
    ftp_password = config['XXX']
    
    local_folder = os.path.join(config['AUDIO_DIR'])
    remote_folder = os.path.join('/', 'httpdocs', 'rockr', 'audio')

    # Establish the connection
    ftp = ftplib.FTP(ftp_server)
    ftp.login(user=ftp_username, passwd=ftp_password)

    # Upload the folder
    upload_folder_to_ftp(ftp, local_folder, remote_folder)

    # Close the connection
    ftp.quit()

    print("Upload Complete")
