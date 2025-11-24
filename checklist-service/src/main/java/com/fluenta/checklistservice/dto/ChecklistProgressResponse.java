package com.fluenta.checklistservice.dto;

public class ChecklistProgressResponse {
    private Long checklistId;
    private String name;
    private long totalItems;
    private long passedItems;
    private double completionPercentage;

    public ChecklistProgressResponse(Long checklistId, String name, long totalItems, long passedItems, double completionPercentage) {
        this.checklistId = checklistId;
        this.name = name;
        this.totalItems = totalItems;
        this.passedItems = passedItems;
        this.completionPercentage = completionPercentage;
    }

    public Long getChecklistId() {
        return checklistId;
    }

    public String getName() {
        return name;
    }

    public long getTotalItems() {
        return totalItems;
    }

    public long getPassedItems() {
        return passedItems;
    }

    public double getCompletionPercentage() {
        return completionPercentage;
    }
}
