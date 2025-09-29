"use client";
import { useRouter } from "next/navigation";
import React, { useCallback, useEffect } from "react";
import * as z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CarsList } from "./cars-list";
import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useDropzone } from "react-dropzone";
import useFetch from "@/hooks/use-fetch";
import { add } from "date-fns";
import { addCar } from "@/actions/cars";
import { Camera, ImagePlus, Loader2, X, Upload } from "lucide-react";
import { processCarImageWithAI } from "@/actions/cars";

// Predefined options
const fuelTypes = ["Petrol", "Diesel", "Electric", "Hybrid", "Plug-in Hybrid"];
const transmissions = ["Automatic", "Manual", "Semi-Automatic"];
const bodyTypes = [
  "SUV",
  "Sedan",
  "Hatchback",
  "Convertible",
  "Coupe",
  "Wagon",
  "Pickup",
];
const carStatuses = ["AVAILABLE", "UNAVAILABLE", "SOLD"];
const carTypes = ["New", "Used", "Certified Pre-Owned"];

// Define form schema with Zod
const carFormSchema = z.object({
  make: z.string().min(1, "Make is required"),
  model: z.string().min(1, "Model is required"),
  year: z.string().refine((val) => {
    const year = parseInt(val);
    return !isNaN(year) && year >= 1900 && year <= new Date().getFullYear() + 1;
  }, "Valid year required"),
  price: z.string().min(1, "Price is required"),
  mileage: z.string().min(1, "Mileage is required"),
  color: z.string().min(1, "Color is required"),
  fuelType: z.string().min(1, "Fuel type is required"),
  transmission: z.string().min(1, "Transmission is required"),
  bodyType: z.string().min(1, "Body type is required"),
  seats: z.string().optional(),
  description: z.string().min(10, "Description must be at least 10 characters"),
  status: z.enum(["AVAILABLE", "UNAVAILABLE", "SOLD"]),
  featured: z.boolean().default(false),
  carType: z.string().min(1, "car type is required"),
  // Images are handled separately
});

const AddCarForm = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("ai");
  const [aiImagePreview, setAIImagePreview] = useState(null);
  const [imageError, setImageError] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedImages, setUploadedImages] = useState([]);
  const [uploadedAiImage, setUploadedAiImage] = useState(null);

  // Initialize form with react-hook-form and zod
  const {
    register,
    setValue,
    getValues,
    formState: { errors },
    handleSubmit,
    watch,
  } = useForm({
    resolver: zodResolver(carFormSchema),
    defaultValues: {
      make: "",
      model: "",
      year: "",
      price: "",
      mileage: "",
      color: "",
      fuelType: "",
      transmission: "",
      bodyType: "",
      seats: "",
      description: "",
      status: "AVAILABLE",
      featured: false,
      carType: "",
    },
  });


  // Handle multiple image uploads with Dropzone
  const onMultiImageDrop = useCallback((acceptedFiles) => {
    console.log("Dropped files:", acceptedFiles);
    // Process the files as needed
    let validFiles = acceptedFiles.filter((file) => {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} is larger than 5MB and will be skipped.`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;
    // Simulate upload progress
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      if (progress >= 100) {
        clearInterval(interval);

        const newImages = [];
        validFiles.forEach((file) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            newImages.push(e.target.result);
            if (newImages.length === validFiles.length) {
              setUploadProgress(0);
              setImageError("");
              setUploadedImages((prev) => [...prev, ...newImages]);
              toast.success(
                `Successfully uploaded ${validFiles.length} images.`
              );
            }
          };
          reader.readAsDataURL(file);
        });
      }
    }, 200);
  }, []);


  // Handle multiple image uploads with Dropzone
  const onAiImageDrop = useCallback((acceptedFiles) => {
    console.log("Dropped AI file:", acceptedFiles);
    // Process the files as needed
    let validFile = acceptedFiles[0]
    if (validFile && validFile.size > 5 * 1024 * 1024) {
      toast.error(`${validFile.name} is larger than 5MB and will be skipped.`);
      return false;
    }
    setUploadedAiImage(validFile)
    // Simulate upload progress
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      if (progress >= 100) {
        clearInterval(interval);

        const reader = new FileReader();
        reader.onload = (e) => {
          setAIImagePreview(e.target.result);
          toast.success(
            `Successfully uploaded image.`
          );
        };
        reader.readAsDataURL(validFile);
      }
    }, 200);
  }, []);

  const {
    getRootProps: getMultiImageRootProps,
    getInputProps: getMultiImageInputProps,
  } = useDropzone({
    onDrop: onMultiImageDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".webp"],
    },
    multiple: true,
  });

  const { getRootProps: getAiRootProps, getInputProps: getAiImageInputProps } = useDropzone({
    onDrop: onAiImageDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".webp"],
    },
    multiple: true,
  })


  const removeImage = (i) => {
    setUploadedImages((prev) => prev.filter((img, index) => index !== i));
  };

  const { loading: carLoading, fn: addCarFn,
    data: addCarResult } = useFetch(addCar);


  const { loading: aiCarLoading, fn: addAICarFn, data: addAICarResult, error: aiError } = useFetch(processCarImageWithAI);

  const processWithAI = async () => {
    if (!uploadedAiImage) {
      toast.error("Please upload an image first");
      return;
    }
    await addAICarFn(uploadedAiImage)
  }

  useEffect(() => {
    if (aiError) {
      toast.error(aiError.message || "Failed to upload car");
    }
  }, [aiError]);

  useEffect(() => {
    if (addAICarResult?.success) {
      const carDetails = addAICarResult.data
      setValue("make", carDetails.make || "");
      setValue("model", carDetails.model || "");
      setValue("year", carDetails.year ? (carDetails.year.toString()) : "");
      setValue("color", carDetails.color);
      setValue("bodyType", carDetails.bodyType);
      setValue("price", carDetails.price);
      setValue("mileage", carDetails.mileage);
      setValue("fuelType", carDetails.fuelType);
      setValue("transmission", carDetails.transmission);
      setValue("description", carDetails.description || "");
      setValue("carType", carDetails.carType);

      const reader = new FileReader();
      reader.onload = (e) => {
        setUploadedImages((prev) => [...prev, e.target.result]);
      };
      reader.readAsDataURL(uploadedAiImage);
      toast.success("Car details extracted.");
      setActiveTab("manual");
      // router.push("/admin/cars");
    }
  }, [addAICarResult, setValue, uploadedAiImage]);

  useEffect(() => {
    if (addCarResult?.success) {
      toast.success("Car added successfully");
      router.push("/admin/cars");
    }
  }, [addCarResult, carLoading]);

  const onSubmit = async (data) => {
    if (uploadedImages.length === 0) {
      setImageError("Please upload at least one image.");
      return;
    }
    const carData = {
      ...data,
      year: parseInt(data.year),
      price: parseFloat(data.price),
      mileage: parseInt(data.mileage),
      seats: data.seats ? parseInt(data.seats) : null,
    }

    await addCarFn({ carData, images: uploadedImages });
  }

  return (
    <>
      <div>AddCarForm</div>
      <div>
        <Tabs
          defaultValue="ai"
          value={activeTab}
          onValueChange={setActiveTab}
          className="mt-6"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual">Manual Entry</TabsTrigger>
            <TabsTrigger value="ai">AI Upload</TabsTrigger>
          </TabsList>
          <TabsContent value="manual" className="mt-6">
            <h3>manual</h3>
            {/* <CarsList/> */}
            <Card>
              <CardHeader>
                <CardTitle>Car Details</CardTitle>
                <CardDescription>Card Description</CardDescription>
                <CardAction>Card Action</CardAction>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Make */}
                    <div className="space-y-2">
                      <Label htmlFor="make">Make</Label>
                      <Input
                        id="make"
                        {...register("make")}
                        placeholder="e.g. Toyota"
                        className={errors.make ? "border-red-500" : ""}
                      />
                      {errors.make && (
                        <p className="text-xs text-red-500">
                          {errors.make.message}
                        </p>
                      )}
                    </div>

                    {/* Model */}
                    <div className="space-y-2">
                      <Label htmlFor="model">Model</Label>
                      <Input
                        id="model"
                        {...register("model")}
                        placeholder="e.g. Camry"
                        className={errors.model ? "border-red-500" : ""}
                      />
                      {errors.model && (
                        <p className="text-xs text-red-500">
                          {errors.model.message}
                        </p>
                      )}
                    </div>

                    {/* Year */}
                    <div className="space-y-2">
                      <Label htmlFor="year">Year</Label>
                      <Input
                        id="year"
                        {...register("year")}
                        placeholder="e.g. 2022"
                        className={errors.year ? "border-red-500" : ""}
                      />
                      {errors.year && (
                        <p className="text-xs text-red-500">
                          {errors.year.message}
                        </p>
                      )}
                    </div>

                    {/* Price */}
                    <div className="space-y-2">
                      <Label htmlFor="price">Price ($)</Label>
                      <Input
                        id="price"
                        {...register("price")}
                        placeholder="e.g. 25000"
                        className={errors.price ? "border-red-500" : ""}
                      />
                      {errors.price && (
                        <p className="text-xs text-red-500">
                          {errors.price.message}
                        </p>
                      )}
                    </div>

                    {/* Mileage */}
                    <div className="space-y-2">
                      <Label htmlFor="mileage">Mileage</Label>
                      <Input
                        id="mileage"
                        {...register("mileage")}
                        placeholder="e.g. 15000"
                        className={errors.mileage ? "border-red-500" : ""}
                      />
                      {errors.mileage && (
                        <p className="text-xs text-red-500">
                          {errors.mileage.message}
                        </p>
                      )}
                    </div>

                    {/* car type */}
                    <div className="space-y-2">
                      <Label htmlFor="car type">Car type</Label>
                      <Select
                        onValueChange={(value) => setValue("carType", value)}
                        defaultValue={getValues("carType")}
                      >
                        <SelectTrigger
                          className={errors.carType ? "border-red-500" : ""}
                        >
                          <SelectValue placeholder="Select car type" />
                        </SelectTrigger>
                        <SelectContent>
                          {carTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.carType && (
                        <p className="text-xs text-red-500">
                          {errors.carType.message}
                        </p>
                      )}
                    </div>

                    {/* Color */}
                    <div className="space-y-2">
                      <Label htmlFor="color">Color</Label>
                      <Input
                        id="color"
                        {...register("color")}
                        placeholder="e.g. Blue"
                        className={errors.color ? "border-red-500" : ""}
                      />
                      {errors.color && (
                        <p className="text-xs text-red-500">
                          {errors.color.message}
                        </p>
                      )}
                    </div>

                    {/* Fuel Type */}
                    <div className="space-y-2">
                      <Label htmlFor="fuelType">Fuel Type</Label>
                      <Select
                        onValueChange={(value) => setValue("fuelType", value)}
                        defaultValue={getValues("fuelType")}
                      >
                        <SelectTrigger
                          className={errors.fuelType ? "border-red-500" : ""}
                        >
                          <SelectValue placeholder="Select fuel type" />
                        </SelectTrigger>
                        <SelectContent>
                          {fuelTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.fuelType && (
                        <p className="text-xs text-red-500">
                          {errors.fuelType.message}
                        </p>
                      )}
                    </div>

                    {/* Transmission */}
                    <div className="space-y-2">
                      <Label htmlFor="transmission">Transmission</Label>
                      <Select
                        onValueChange={(value) =>
                          setValue("transmission", value)
                        }
                        defaultValue={getValues("transmission")}
                      >
                        <SelectTrigger
                          className={
                            errors.transmission ? "border-red-500" : ""
                          }
                        >
                          <SelectValue placeholder="Select transmission" />
                        </SelectTrigger>
                        <SelectContent>
                          {transmissions.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.transmission && (
                        <p className="text-xs text-red-500">
                          {errors.transmission.message}
                        </p>
                      )}
                    </div>

                    {/* Body Type */}
                    <div className="space-y-2">
                      <Label htmlFor="bodyType">Body Type</Label>
                      <Select
                        onValueChange={(value) => setValue("bodyType", value)}
                        defaultValue={getValues("bodyType")}
                      >
                        <SelectTrigger
                          className={errors.bodyType ? "border-red-500" : ""}
                        >
                          <SelectValue placeholder="Select body type" />
                        </SelectTrigger>
                        <SelectContent>
                          {bodyTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.bodyType && (
                        <p className="text-xs text-red-500">
                          {errors.bodyType.message}
                        </p>
                      )}
                    </div>

                    {/* Seats */}
                    <div className="space-y-2">
                      <Label htmlFor="seats">
                        Number of Seats{" "}
                        <span className="text-sm text-gray-500">
                          (Optional)
                        </span>
                      </Label>
                      <Input
                        id="seats"
                        {...register("seats")}
                        placeholder="e.g. 5"
                      />
                    </div>

                    {/* Status */}
                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Select
                        onValueChange={(value) => setValue("status", value)}
                        defaultValue={getValues("status")}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          {carStatuses.map((status) => (
                            <SelectItem key={status} value={status}>
                              {status.charAt(0) + status.slice(1).toLowerCase()}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      {...register("description")}
                      placeholder="Enter detailed description of the car..."
                      className={`min-h-32 ${errors.description ? "border-red-500" : ""
                        }`}
                    />
                    {errors.description && (
                      <p className="text-xs text-red-500">
                        {errors.description.message}
                      </p>
                    )}
                  </div>

                  {/* Featured */}
                  <div className="flex items-start space-x-3 space-y-0 rounded-md border p-4">
                    <Checkbox
                      id="featured"
                      checked={watch("featured")}
                      onCheckedChange={(checked) => {
                        setValue("featured", checked);
                      }}
                    />
                    <div className="space-y-1 leading-none">
                      <Label htmlFor="featured">Feature this car</Label>
                      <p className="text-sm text-gray-500">
                        Featured cars appear on the homepage
                      </p>
                    </div>
                  </div>

                  {/* Image Upload with Dropzone */}
                  <div>
                    <Label
                      htmlFor="images"
                      className={imageError ? "text-red-500" : ""}
                    >
                      Images{" "}
                      {imageError && <span className="text-red-500">*</span>}
                    </Label>
                    <div className="mt-2">
                      <div
                        {...getMultiImageRootProps()}
                        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-gray-50 transition mt-2${imageError ? "border-red-500" : "border-gray-300"
                          }`}
                      >
                        <input {...getMultiImageInputProps()} />
                        <div className="flex flex-col items-center justify-center">
                          <Upload className="h-12 w-12 text-gray-400 mb-3" />
                          <span className="text-sm text-gray-600">
                            Drag & drop or click to upload multiple images
                          </span>
                          <span className="text-xs text-gray-500 mt-1">
                            (JPG, PNG, WebP, max 5MB each)
                          </span>
                        </div>
                      </div>
                      {imageError && (
                        <p className="text-xs text-red-500 mt-1">
                          {imageError}
                        </p>
                      )}
                      {uploadProgress > 0 && (
                        <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                          <div
                            className="bg-blue-600 h-2.5 rounded-full"
                            style={{ width: `${uploadProgress}%` }}
                          ></div>
                        </div>
                      )}
                    </div>


                    {/* Image Previews */}
                    {uploadedImages.length > 0 && (
                      <div className="mt-4">
                        <h3 className="text-sm font-medium mb-2">
                          Uploaded Images ({uploadedImages.length})
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                          {uploadedImages.map((image, index) => (
                            <div key={index} className="relative group">
                              <Image
                                src={image}
                                alt={`Car image ${index + 1}`}
                                height={50}
                                width={50}
                                className="h-28 w-full object-cover rounded-md"
                                priority={true}
                              />
                              <Button
                                type="button"
                                size="icon"
                                variant="destructive"
                                className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => removeImage(index)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}


                  </div>

                  <Button
                    type="submit"
                    className="w-full md:w-auto"
                    disabled={carLoading}
                  >
                    {carLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Adding Car...
                      </>
                    ) : (
                      "Add Car"
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="ai" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>AI-Powered Car Details Extraction</CardTitle>
                <CardDescription>
                  Upload an image of a car and let Gemini AI extract its details.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>{aiImagePreview ?
                    <div className="flex relative inline-block">
                      <img
                        src={aiImagePreview}
                        alt={`Car image`}
                        className="max-h-56 max-w-full object-contain"
                        priority
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="absolute top-2 right-2 rounded-full "
                        onClick={() => { setAIImagePreview(null); setUploadedAiImage(null) }}
                      >
                        <X className="h-3 w-3" />
                      </Button>

                      <Button
                        onClick={processWithAI}
                        disabled={aiCarLoading}
                        size="sm"
                      >
                        {aiCarLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <Camera className="mr-2 h-4 w-4" />
                            Extract Details
                          </>
                        )}
                      </Button>

                    </div> :
                    (
                      <div
                        {...getAiRootProps()}
                        className="cursor-pointer hover:bg-gray-50 transition"
                      >
                        <input {...getAiImageInputProps()} />
                        <div className="flex flex-col items-center justify-center">
                          <Camera className="h-12 w-12 text-gray-400 mb-3" />
                          <span className="text-sm text-gray-600">
                            Drag & drop or click to upload a car image
                          </span>
                          <span className="text-xs text-gray-500 mt-1">
                            (JPG, PNG, WebP, max 5MB)
                          </span>
                        </div>
                      </div>
                    )}</div>

                  {aiCarLoading && (
                    <div className="bg-blue-50 text-blue-700 p-4 rounded-md flex items-center">
                      <Loader2 className="animate-spin h-5 w-5 mr-2" />
                      <div>
                        <p className="font-medium">Analyzing image...</p>
                        <p className="text-sm">
                          Gemini AI is extracting car details
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="bg-gray-50 p-4 rounded-md">
                    <h3 className="font-medium mb-2">How it works</h3>
                    <ol className="space-y-2 text-sm text-gray-600 list-decimal pl-4">
                      <li>Upload a clear image of the car</li>
                      <li>Click "Extract Details" to analyze with Gemini AI</li>
                      <li>Review the extracted information</li>
                      <li>Fill in any missing details manually</li>
                      <li>Add the car to your inventory</li>
                    </ol>
                  </div>



                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
};

export default AddCarForm;
