// Global variables
let imageDataURL = '';
let img = new Image();
let stream = null;
const imageUpload = document.getElementById('imageUpload');
const imagePreview = document.getElementById('imagePreview');
const video = document.getElementById('video');
const captureButton = document.getElementById('capture');
const canvas = document.getElementById('canvas');
const context = canvas.getContext('2d');
const leftEyeCanvas = document.getElementById('leftEye').getContext('2d');
const rightEyeCanvas = document.getElementById('rightEye').getContext('2d');

// Start Camera
document.getElementById('startCamera').addEventListener('click', async () => {
	refreshAllView();
	if (stream) {
        let tracks = stream.getTracks();
        tracks.forEach(track => track.stop());
        video.srcObject = null; // Clear the video source
		document.getElementById('startCamera').textContent = 'Open Camera'
		stream = null;
		aptureButton.disabled = true;
    }else{
		document.getElementById('startCamera').textContent = 'Close Camera'
		try{
		stream = await navigator.mediaDevices.getUserMedia({ video: true });
		video.srcObject = stream;
		captureButton.disabled = false;
		}catch(error){
			console.error('Camera is not available or permission denied:', error.message);
			alert('Camera is not available on this device or permission denied. Please try to upload an image.');
		}
	}
    
});

// Capture Image from Camera
captureButton.addEventListener('click', () => {
	refreshAllView();
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    imageDataURL = canvas.toDataURL('image/jpeg');
	img.src = imageDataURL;
    imagePreview.src = imageDataURL;
    imagePreview.style.display = 'block';
	//canvas.style.display = 'block';
    //video.srcObject.getTracks().forEach(track => track.stop()); // Stop the camera
	imageUpload.value='';
});

// Image Upload Logic
imageUpload.addEventListener('change', handleImageUpload);

function handleImageUpload(event) {
    const file = event.target.files[0];
	if (!file) {
        alert('Please select an image file.');
        return;
    }
    const reader = new FileReader();
    reader.onloadend = function () {
		img.src = reader.result;/////
        imagePreview.src = reader.result;
        //imagePreview.style.display = 'block';
    };
    reader.readAsDataURL(file);
	imageDataURL = '';
	refreshAllView();
}


document.getElementById('submitImage').addEventListener('click', function () {
   if(!imageDataURL){
	   // for uploaded image
	    const fileInput = document.getElementById('imageUpload');
		const file = fileInput.files[0];

		if (!file) {
			alert('Please select an image file before uploading.');
			return;
		}

		const reader = new FileReader();
		reader.onload = function (event) {
			const image = event.target.result.split(',')[1]; // Get base64 string
			getRoboflowResponseAndCropping(image, 'uploaded');
		}
		reader.readAsDataURL(file); // Read the file as a base64 encoded string for uploading
   }else{
	   // for caputured image from video
	   //console.log('ha ha');
	   const image = imageDataURL.split(',')[1]; // Get base64 string
	   getRoboflowResponseAndCropping(image, 'captured');
	   imageDataURL = '';
   }
});

// Roboflow Response
function getRoboflowResponseAndCropping(base64Image, type){
	axios({
            method: "POST",
            url: "https://detect.roboflow.com/healthy-eye-detection/2",
            params: {
                api_key: "hOD4rpSd24OEzzAeQBWJ"
            },
            data: base64Image,
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            }
        })
        .then(function(response) {
			const robflowResponse = response.data;
			cropAndClassifyEyes(robflowResponse, type)
			//console.log(robflowResponse);
            //document.getElementById('result').textContent = JSON.stringify(response.data, null, 2);
        })
        .catch(function(error) {
            console.log("Error Occured: "+error.message);
			alert('Problem with this snap. Please try another one.');
            //document.getElementById('result').textContent = error.message;
        });
}



// Crop Eyes and Classify
function cropAndClassifyEyes(roboflowResponse, type) {
    const detections = roboflowResponse.predictions;
    
    // Assuming Roboflow returns bounding boxes for both eyes
    let leftEye = detections.find(d => d.class === 'left');
    let rightEye = detections.find(d => d.class === 'right');
	
	// For camera captured image somehow images are become swapped; to solve this we interchange the images
	if(type=='captured'){
		let temp = leftEye;
		leftEye = rightEye;
		rightEye = temp;
	}
	console.log(leftEye);
	console.log(rightEye)


    // Crop Left Eye
    if (leftEye) {
        leftEyeCanvas.drawImage(img, leftEye.x-leftEye.width/2, leftEye.y-leftEye.height/2, leftEye.width, leftEye.height, 0, 0, 300, 200);

		const left_eye_image = leftEyeCanvas.canvas.toDataURL().split(',')[1]; // Get base64 string;
		getRoboflowResponseDiseaseDetection('left', left_eye_image);
    }else{
			leftEyeCanvas.fillStyle = "#f0f0f0";
            leftEyeCanvas.fillRect(0, 0, 300, 200);

            // Set text properties
            leftEyeCanvas.font = "bold 35px Arial";
            leftEyeCanvas.fillStyle = "black";
            leftEyeCanvas.textAlign = "center";
            leftEyeCanvas.textBaseline = "middle";
			leftEyeCanvas.fillText("Not Detected",150,70)
			
			document.getElementById('leftResult').textContent = 'N/A';
	}

    // Crop Right Eye
    if (rightEye) {
        rightEyeCanvas.drawImage(img, rightEye.x-rightEye.width/2, rightEye.y-rightEye.height/2, rightEye.width, rightEye.height, 0, 0, 300, 200);

		const right_eye_image = rightEyeCanvas.canvas.toDataURL().split(',')[1]; // Get base64 string;
		getRoboflowResponseDiseaseDetection('right', right_eye_image);
    }else{
			rightEyeCanvas.fillStyle = "#f0f0f0";
            rightEyeCanvas.fillRect(0, 0, 300, 200);

            // Set text properties
            rightEyeCanvas.font = "bold 35px Arial";
            rightEyeCanvas.fillStyle = "black";
            rightEyeCanvas.textAlign = "center";
            rightEyeCanvas.textBaseline = "middle";
			rightEyeCanvas.fillText("Not Detected",150,70)
			
			document.getElementById('rightResult').textContent = 'N/A';
	}
}

// Function to Classify Eye Using Your Lightweight DL Model
function loadDiseaseInformation(eye, disease) {
	if (eye=='left'){
		document.getElementById('leftResult').textContent = disease;
		console.log('Left Eye: '+disease);
	}else{
		document.getElementById('rightResult').textContent = disease;
		console.log('Right Eye: '+disease);
	}
    //const result = await classifyEyeDisease(eyeImageData); // Call your DL model function
    //document.getElementById('result').innerText += `${eye.charAt(0).toUpperCase() + eye.slice(1)} Eye Disease: ${result}\n`;
}

function getRoboflowResponseDiseaseDetection(eye, base64Image){
	axios({
            method: "POST",
            url: "https://detect.roboflow.com/eye-classification-l8jtg/1",
            params: {
                api_key: "hOD4rpSd24OEzzAeQBWJ"
            },
            data: base64Image,
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            }
        })
        .then(function(response) {
			let robflowResponse = response.data['predicted_classes']+"";
			loadDiseaseInformation(eye, robflowResponse.replaceAll('_', ' '))
			//console.log(robflowResponse);
            //document.getElementById('result').textContent = JSON.stringify(response.data, null, 2);
        })
        .catch(function(error) {
            console.log(error.message);
            //document.getElementById('result').textContent = error.message;
        });
}

function refreshAllView(){
	document.getElementById('leftResult').textContent = "";
	document.getElementById('rightResult').textContent = "";
	
	rightEyeCanvas.fillStyle = "#f0f0f0";
    rightEyeCanvas.fillRect(0, 0, 300, 200);
	
	leftEyeCanvas.fillStyle = "#f0f0f0";
    leftEyeCanvas.fillRect(0, 0, 300, 200);
}
